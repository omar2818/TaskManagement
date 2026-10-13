using Microsoft.EntityFrameworkCore;
using TaskManagement.Domain.Entities;
using TaskManagement.Domain.Repositories;
using TaskManagement.Infrastructure.Persistence;

namespace TaskManagement.Infrastructure.Repositories;

public sealed class TaskRepository(AppDbContext db) : ITaskRepository
{
    public async Task AddAsync(TaskItem task, CancellationToken ct = default)
        => await db.Tasks.AddAsync(task, ct);

    public Task<TaskItem?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => db.Tasks.FirstOrDefaultAsync(t => t.Id == id, ct);

    public async Task<IReadOnlyList<TaskItem>> ListByUserAsync(Guid userId, CancellationToken ct = default)
        => await db.Tasks
            .AsNoTracking()
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.Priority)   // High -> Low
            .ThenBy(t => t.CreatedAt)             // then oldest first
            .ToListAsync(ct);

    public Task<bool> ExistsDuplicateAsync(Guid userId, string title, DateTime dayStartUtc, DateTime dayEndUtc, CancellationToken ct = default)
    {
        var normalized = title.Trim().ToLower();
        return db.Tasks.AnyAsync(t =>
            t.UserId == userId &&
            t.CreatedAt >= dayStartUtc && t.CreatedAt < dayEndUtc &&
            t.Title.ToLower() == normalized, ct);
    }
}
