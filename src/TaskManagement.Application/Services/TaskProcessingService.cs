using Microsoft.Extensions.Logging;
using TaskManagement.Application.Interfaces;
using TaskManagement.Domain.Repositories;

namespace TaskManagement.Application.Services;

public interface ITaskProcessingService
{
    Task ProcessAsync(Guid taskId, CancellationToken ct = default);
}

/// <summary>The work done by the background worker for each queued task.</summary>
public sealed class TaskProcessingService(
    ITaskRepository tasks,
    IUnitOfWork uow,
    ICacheService cache,
    ILogger<TaskProcessingService> logger) : ITaskProcessingService
{
    public async Task ProcessAsync(Guid taskId, CancellationToken ct = default)
    {
        var task = await tasks.GetByIdAsync(taskId, ct);
        if (task is null)
        {
            logger.LogWarning("Queued task {TaskId} no longer exists - skipping", taskId);
            return;
        }

        task.MarkProcessed();
        await uow.SaveChangesAsync(ct);
        await cache.RemoveAsync(TaskCacheKeys.For(taskId), ct);
        logger.LogInformation("Task {TaskId} processed in background; status is now {Status}", taskId, task.Status);
    }
}
