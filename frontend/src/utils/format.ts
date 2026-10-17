import type { TaskResponse, TaskStatus } from "../api/types";

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  Pending: "Pending",
  InProgress: "In progress",
  Done: "Done",
};

/** A task the background worker has not picked up yet (the UI polls while any task is in this state). */
export function isAwaitingProcessing(task: TaskResponse): boolean {
  return task.status === "Pending" && task.processedAt === null;
}
