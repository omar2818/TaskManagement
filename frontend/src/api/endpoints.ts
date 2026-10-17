import { request } from "./client";
import type {
  AuthResponse,
  CreateTaskRequest,
  CreateUserRequest,
  LoginRequest,
  RegisterRequest,
  TaskResponse,
  TaskStatus,
  UpdateTaskStatusRequest,
  UserResponse,
} from "./types";

export const authApi = {
  login: (body: LoginRequest) => request<AuthResponse>("/api/auth/login", { method: "POST", body, auth: false }),
  register: (body: RegisterRequest) => request<UserResponse>("/api/auth/register", { method: "POST", body, auth: false }),
  me: () => request<UserResponse>("/api/users/me"),
};

export const tasksApi = {
  list: () => request<TaskResponse[]>("/api/tasks"),
  get: (id: string) => request<TaskResponse>(`/api/tasks/${encodeURIComponent(id)}`),
  create: (body: CreateTaskRequest) => request<TaskResponse>("/api/tasks", { method: "POST", body }),
  updateStatus: (id: string, status: TaskStatus) => {
    const body: UpdateTaskStatusRequest = { status };
    return request<TaskResponse>(`/api/tasks/${encodeURIComponent(id)}/status`, { method: "PATCH", body });
  },
};

export const usersApi = {
  list: () => request<UserResponse[]>("/api/admin/users"),
  create: (body: CreateUserRequest) => request<UserResponse>("/api/admin/users", { method: "POST", body }),
  remove: (id: string) => request<void>(`/api/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
