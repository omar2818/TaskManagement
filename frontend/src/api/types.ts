// Types mirror the .NET API contracts (JSON is camelCase, enums are strings).

export type UserRole = "User" | "Admin";
export type TaskStatus = "Pending" | "InProgress" | "Done";
export type TaskPriority = "Low" | "Medium" | "High";

export const TASK_STATUSES: readonly TaskStatus[] = ["Pending", "InProgress", "Done"];
export const TASK_PRIORITIES: readonly TaskPriority[] = ["Low", "Medium", "High"];

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface CreateUserRequest extends RegisterRequest {
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresAtUtc: string;
}

export interface TaskResponse {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string | null;
  processedAt: string | null;
  userId: string;
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  priority: TaskPriority;
}

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
}

/** RFC 7807 problem details as returned by the API for every error. */
export interface ProblemDetails {
  status?: number;
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}
