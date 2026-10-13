namespace TaskManagement.Domain.Enums;

public enum UserRole { User = 1, Admin = 2 }

public enum TaskItemStatus { Pending = 1, InProgress = 2, Done = 3 }

/// <summary>Numeric values matter: higher value = higher priority (used for sorting).</summary>
public enum TaskPriority { Low = 1, Medium = 2, High = 3 }
