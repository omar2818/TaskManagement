import { getToken } from "../auth/tokenStorage";
import type { ProblemDetails } from "./types";

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

const DEFAULT_MESSAGES: Record<number, string> = {
  400: "Some of the information you entered is not valid.",
  401: "Your session is invalid or has expired. Please log in again.",
  403: "You don't have permission to do that.",
  404: "The requested item was not found.",
  409: "This conflicts with existing data.",
  500: "Something went wrong on the server. Please try again.",
};

export class ApiError extends Error {
  readonly status: number;
  /** Per-field messages from 400 validation responses, keyed as the API sends them (e.g. "Title"). */
  readonly fieldErrors: Record<string, string[]>;

  constructor(status: number, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** Builds a readable message from a problem-details body (pure function, unit tested). */
export function messageFromProblem(status: number, problem: ProblemDetails | null): string {
  if (problem?.errors) {
    const messages = Object.values(problem.errors).flat();
    if (messages.length > 0) return messages.join(" ");
  }
  if (problem?.detail) return problem.detail;
  return DEFAULT_MESSAGES[status] ?? `Request failed (${status}).`;
}

async function toApiError(response: Response): Promise<ApiError> {
  let problem: ProblemDetails | null = null;
  try {
    const text = await response.text();
    problem = text ? (JSON.parse(text) as ProblemDetails) : null;
  } catch {
    problem = null;
  }
  return new ApiError(response.status, messageFromProblem(response.status, problem), problem?.errors ?? {});
}

// --- 401 handling lives in ONE place: the client calls this handler, the AuthProvider logs the user out. ---
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** false for login/register: no token is sent and a 401 is a normal "wrong credentials" answer. */
  auth?: boolean;
  signal?: AbortSignal;
}

/** The single API client: adds the JWT to every request, parses errors, and handles 401 centrally. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, signal } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = auth ? getToken() : null;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "Cannot reach the server. Check your connection and try again.");
  }

  if (response.status === 401 && token) unauthorizedHandler?.();
  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

/** Case-insensitive lookup of a server-side validation message for a form field. */
export function getFieldError(error: unknown, field: string): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  const key = Object.keys(error.fieldErrors).find((k) => k.toLowerCase() === field.toLowerCase());
  return key ? error.fieldErrors[key]?.[0] : undefined;
}

export function hasFieldErrors(error: unknown): boolean {
  return error instanceof ApiError && Object.keys(error.fieldErrors).length > 0;
}
