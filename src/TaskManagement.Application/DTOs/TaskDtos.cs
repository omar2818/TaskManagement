using System.ComponentModel.DataAnnotations;
using TaskManagement.Domain.Entities;
using TaskManagement.Domain.Enums;

namespace TaskManagement.Application.DTOs;

public sealed class CreateTaskRequest
{
    [Required, StringLength(200)]
    public string Title { get; set; } = string.Empty;

    [StringLength(2000)]
    public string? Description { get; set; }

    [EnumDataType(typeof(TaskPriority))]
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
}

public sealed class UpdateTaskStatusRequest
{
    [EnumDataType(typeof(TaskItemStatus))]
    public TaskItemStatus Status { get; set; }
}

public sealed record TaskResponse(
    Guid Id,
    string Title,
    string? Description,
    TaskItemStatus Status,
    TaskPriority Priority,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    DateTime? ProcessedAt,
    Guid UserId)
{
    public static TaskResponse From(TaskItem t) =>
        new(t.Id, t.Title, t.Description, t.Status, t.Priority, t.CreatedAt, t.UpdatedAt, t.ProcessedAt, t.UserId);
}
