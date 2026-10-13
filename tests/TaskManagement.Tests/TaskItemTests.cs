using TaskManagement.Domain.Entities;
using TaskManagement.Domain.Enums;
using TaskManagement.Domain.Exceptions;
using Xunit;

namespace TaskManagement.Tests;

public class TaskItemTests
{
    [Fact]
    public void Create_StartsPending_AndTrimsTitle()
    {
        var task = TaskItem.Create(Guid.NewGuid(), "  Hello  ", null, TaskPriority.High);

        Assert.Equal("Hello", task.Title);
        Assert.Equal(TaskItemStatus.Pending, task.Status);
    }

    [Fact]
    public void Create_WithBlankTitle_Throws()
        => Assert.Throws<DomainException>(() => TaskItem.Create(Guid.NewGuid(), "   ", null, TaskPriority.Low));

    [Fact]
    public void MarkProcessed_MovesPendingToInProgress_ButKeepsDone()
    {
        var pending = TaskItem.Create(Guid.NewGuid(), "A", null, TaskPriority.Low);
        pending.MarkProcessed();
        Assert.Equal(TaskItemStatus.InProgress, pending.Status);
        Assert.NotNull(pending.ProcessedAt);

        var done = TaskItem.Create(Guid.NewGuid(), "B", null, TaskPriority.Low);
        done.UpdateStatus(TaskItemStatus.Done);
        done.MarkProcessed();
        Assert.Equal(TaskItemStatus.Done, done.Status);
    }

    [Fact]
    public void PriorityOrdering_HighIsGreaterThanLow()
        => Assert.True(TaskPriority.High > TaskPriority.Medium && TaskPriority.Medium > TaskPriority.Low);
}
