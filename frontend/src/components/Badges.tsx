import type { TaskPriority, TaskStatus } from "../api/types";
import { STATUS_LABELS } from "../utils/format";

export function StatusBadge({ status, processing = false }: { status: TaskStatus; processing?: boolean }) {
  return (
    <span className={`badge badge--status-${status.toLowerCase()}`}>
      {processing && <span className="spinner spinner--tiny" aria-hidden="true" />}
      {processing ? "Processing..." : STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <span className={`badge badge--priority-${priority.toLowerCase()}`}>{priority}</span>;
}
