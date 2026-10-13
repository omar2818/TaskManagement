using TaskManagement.Domain.Common;
using TaskManagement.Domain.Enums;
using TaskManagement.Domain.Exceptions;

namespace TaskManagement.Domain.Entities;

public sealed class TaskItem : Entity
{
    private TaskItem() { }

    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public TaskItemStatus Status { get; private set; }
    public TaskPriority Priority { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }
    public DateTime? ProcessedAt { get; private set; }
    public Guid UserId { get; private set; }

    public static TaskItem Create(Guid userId, string title, string? description, TaskPriority priority)
    {
        if (userId == Guid.Empty) throw new DomainException("A task must belong to a user.");
        if (string.IsNullOrWhiteSpace(title)) throw new DomainException("Title is required.");
        if (title.Trim().Length > 200) throw new DomainException("Title cannot exceed 200 characters.");
        if (!Enum.IsDefined(priority)) throw new DomainException("Invalid priority.");

        return new TaskItem
        {
            UserId = userId,
            Title = title.Trim(),
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
            Priority = priority,
            Status = TaskItemStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
    }

    public bool IsOwnedBy(Guid userId) => UserId == userId;

    public void UpdateStatus(TaskItemStatus status)
    {
        if (!Enum.IsDefined(status)) throw new DomainException("Invalid status.");
        Status = status;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Called by the background worker: a Pending task moves to InProgress once picked up.</summary>
    public void MarkProcessed()
    {
        if (Status == TaskItemStatus.Pending) Status = TaskItemStatus.InProgress;
        ProcessedAt = DateTime.UtcNow;
        UpdatedAt = ProcessedAt;
    }
}
