using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TaskManagement.Application.DTOs;
using TaskManagement.Application.Exceptions;
using TaskManagement.Application.Interfaces;
using TaskManagement.Application.Services;
using TaskManagement.Domain.Entities;
using TaskManagement.Domain.Enums;
using TaskManagement.Domain.Repositories;
using Xunit;

namespace TaskManagement.Tests;

public class TaskServiceTests
{
    private readonly Mock<ITaskRepository> _repo = new();
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly Mock<ICacheService> _cache = new();
    private readonly Mock<ITaskQueue> _queue = new();
    private readonly Guid _userId = Guid.NewGuid();

    private TaskService Sut() => new(_repo.Object, _uow.Object, _cache.Object, _queue.Object, NullLogger<TaskService>.Instance);

    private void SetupDuplicate(bool exists) =>
        _repo.Setup(r => r.ExistsDuplicateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync(exists);

    private void SetupCache(TaskResponse? cached) =>
        _cache.Setup(c => c.GetAsync<TaskResponse>(It.IsAny<string>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(cached);

    [Fact]
    public async Task Create_WithDuplicateTitleSameDay_ThrowsConflict_AndDoesNotEnqueue()
    {
        SetupDuplicate(true);

        await Assert.ThrowsAsync<ConflictException>(() =>
            Sut().CreateAsync(_userId, new CreateTaskRequest { Title = "Write report" }));

        _queue.Verify(q => q.EnqueueAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        _repo.Verify(r => r.AddAsync(It.IsAny<TaskItem>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Create_Valid_SavesTask_AndEnqueuesIt()
    {
        SetupDuplicate(false);

        var result = await Sut().CreateAsync(_userId,
            new CreateTaskRequest { Title = "Write report", Priority = TaskPriority.High });

        Assert.Equal(TaskItemStatus.Pending, result.Status);
        Assert.Equal(_userId, result.UserId);
        _repo.Verify(r => r.AddAsync(It.IsAny<TaskItem>(), It.IsAny<CancellationToken>()), Times.Once);
        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _queue.Verify(q => q.EnqueueAsync(result.Id, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetById_CacheHit_DoesNotTouchDatabase()
    {
        var task = TaskItem.Create(_userId, "Cached", null, TaskPriority.Low);
        SetupCache(TaskResponse.From(task));

        var result = await Sut().GetByIdAsync(_userId, task.Id);

        Assert.Equal(task.Id, result.Id);
        _repo.Verify(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetById_CacheMiss_LoadsFromDatabase_AndPopulatesCache()
    {
        var task = TaskItem.Create(_userId, "Fresh", null, TaskPriority.Medium);
        SetupCache(null);
        _repo.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);

        var result = await Sut().GetByIdAsync(_userId, task.Id);

        Assert.Equal(task.Id, result.Id);
        _cache.Verify(c => c.SetAsync(It.IsAny<string>(), It.IsAny<TaskResponse>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetById_TaskOwnedByAnotherUser_ThrowsNotFound()
    {
        var task = TaskItem.Create(Guid.NewGuid(), "Not mine", null, TaskPriority.Low);
        SetupCache(null);
        _repo.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);

        await Assert.ThrowsAsync<NotFoundException>(() => Sut().GetByIdAsync(_userId, task.Id));
    }

    [Fact]
    public async Task GetById_CachedTaskOfAnotherUser_ThrowsNotFound()
    {
        var task = TaskItem.Create(Guid.NewGuid(), "Not mine", null, TaskPriority.Low);
        SetupCache(TaskResponse.From(task));

        await Assert.ThrowsAsync<NotFoundException>(() => Sut().GetByIdAsync(_userId, task.Id));
    }

    [Fact]
    public async Task UpdateStatus_UpdatesTask_AndInvalidatesCache()
    {
        var task = TaskItem.Create(_userId, "Update me", null, TaskPriority.Low);
        _repo.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);

        var result = await Sut().UpdateStatusAsync(_userId, task.Id, new UpdateTaskStatusRequest { Status = TaskItemStatus.Done });

        Assert.Equal(TaskItemStatus.Done, result.Status);
        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _cache.Verify(c => c.RemoveAsync(TaskCacheKeys.For(task.Id), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdateStatus_OnAnotherUsersTask_ThrowsNotFound()
    {
        var task = TaskItem.Create(Guid.NewGuid(), "Not mine", null, TaskPriority.Low);
        _repo.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            Sut().UpdateStatusAsync(_userId, task.Id, new UpdateTaskStatusRequest { Status = TaskItemStatus.Done }));
    }
}
