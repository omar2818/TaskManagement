using Microsoft.Extensions.Logging;
using TaskManagement.Application.DTOs;
using TaskManagement.Application.Exceptions;
using TaskManagement.Application.Interfaces;
using TaskManagement.Domain.Entities;
using TaskManagement.Domain.Repositories;

namespace TaskManagement.Application.Services;

public static class TaskCacheKeys
{
    public static string For(Guid taskId) => $"task:{taskId}";
}

public interface ITaskService
{
    Task<TaskResponse> CreateAsync(Guid userId, CreateTaskRequest request, CancellationToken ct = default);
    Task<TaskResponse> GetByIdAsync(Guid userId, Guid taskId, CancellationToken ct = default);
    Task<IReadOnlyList<TaskResponse>> ListAsync(Guid userId, CancellationToken ct = default);
    Task<TaskResponse> UpdateStatusAsync(Guid userId, Guid taskId, UpdateTaskStatusRequest request, CancellationToken ct = default);
}

public sealed class TaskService(
    ITaskRepository tasks,
    IUnitOfWork uow,
    ICacheService cache,
    ITaskQueue queue,
    ILogger<TaskService> logger) : ITaskService
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(10);

    public async Task<TaskResponse> CreateAsync(Guid userId, CreateTaskRequest request, CancellationToken ct = default)
    {
        // Business rule: no duplicate title (case-insensitive) on the same (UTC) day for the same user.
        var dayStart = DateTime.UtcNow.Date;
        if (await tasks.ExistsDuplicateAsync(userId, request.Title.Trim(), dayStart, dayStart.AddDays(1), ct))
            throw new ConflictException("You already created a task with this title today.");

        var task = TaskItem.Create(userId, request.Title, request.Description, request.Priority);
        await tasks.AddAsync(task, ct);
        await uow.SaveChangesAsync(ct);

        // Hand off to the background worker only after the task is safely persisted.
        await queue.EnqueueAsync(task.Id, ct);
        logger.LogInformation("Task {TaskId} created for user {UserId} and queued for processing", task.Id, userId);

        return TaskResponse.From(task);
    }

    public async Task<TaskResponse> GetByIdAsync(Guid userId, Guid taskId, CancellationToken ct = default)
    {
        var key = TaskCacheKeys.For(taskId);

        var cached = await cache.GetAsync<TaskResponse>(key, ct);
        if (cached is not null)
        {
            logger.LogInformation("Cache HIT for task {TaskId}", taskId);
            // Ownership is enforced on cache hits too. 404 (not 403) so task ids can't be probed.
            if (cached.UserId != userId) throw new NotFoundException("Task not found.");
            return cached;
        }

        logger.LogInformation("Cache MISS for task {TaskId} - loading from database", taskId);
        var task = await tasks.GetByIdAsync(taskId, ct);
        if (task is null || !task.IsOwnedBy(userId)) throw new NotFoundException("Task not found.");

        var response = TaskResponse.From(task);
        await cache.SetAsync(key, response, CacheTtl, ct);
        return response;
    }

    public async Task<IReadOnlyList<TaskResponse>> ListAsync(Guid userId, CancellationToken ct = default)
        => (await tasks.ListByUserAsync(userId, ct)).Select(TaskResponse.From).ToList();

    public async Task<TaskResponse> UpdateStatusAsync(Guid userId, Guid taskId, UpdateTaskStatusRequest request, CancellationToken ct = default)
    {
        var task = await tasks.GetByIdAsync(taskId, ct);
        if (task is null || !task.IsOwnedBy(userId)) throw new NotFoundException("Task not found.");

        task.UpdateStatus(request.Status);
        await uow.SaveChangesAsync(ct);

        // Invalidate so the next GET reloads fresh data from the database.
        await cache.RemoveAsync(TaskCacheKeys.For(taskId), ct);
        logger.LogInformation("Task {TaskId} status set to {Status}; cache invalidated", taskId, task.Status);

        return TaskResponse.From(task);
    }
}
