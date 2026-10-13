using TaskManagement.Domain.Entities;

namespace TaskManagement.Domain.Repositories;

public interface ITaskRepository
{
    Task AddAsync(TaskItem task, CancellationToken ct = default);
    Task<TaskItem?> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>The user's tasks sorted by priority (High first), then by creation date (oldest first).</summary>
    Task<IReadOnlyList<TaskItem>> ListByUserAsync(Guid userId, CancellationToken ct = default);

    /// <summary>True if the user already has a task with this title (case-insensitive) created in [dayStartUtc, dayEndUtc).</summary>
    Task<bool> ExistsDuplicateAsync(Guid userId, string title, DateTime dayStartUtc, DateTime dayEndUtc, CancellationToken ct = default);
}
