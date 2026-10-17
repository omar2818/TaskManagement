import { Link, useParams } from "react-router-dom";
import { ApiError, getErrorMessage } from "../api/client";
import { TASK_STATUSES, type TaskStatus } from "../api/types";
import { PriorityBadge, StatusBadge } from "../components/Badges";
import { EmptyState, ErrorAlert, ErrorState, Spinner } from "../components/StateMessages";
import { useTask, useUpdateTaskStatus } from "../hooks/useTasks";
import { STATUS_LABELS, formatDate, isAwaitingProcessing } from "../utils/format";

export default function TaskDetailsPage() {
  const { id = "" } = useParams();
  const { data: task, isLoading, isError, error, refetch } = useTask(id);
  const update = useUpdateTaskStatus();

  if (isLoading) return <Spinner label="Loading task..." />;

  if (isError) {
    // 404 covers both an unknown id and another user's task (the API never reveals the difference).
    if (error instanceof ApiError && error.status === 404) {
      return (
        <EmptyState>
          <h1>Task not found</h1>
          <p>This task doesn't exist or isn't yours.</p>
          <Link to="/tasks">Back to my tasks</Link>
        </EmptyState>
      );
    }
    return <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />;
  }
  if (!task) return null;

  const processing = isAwaitingProcessing(task);

  return (
    <article className="card">
      <p>
        <Link to="/tasks">&larr; Back to my tasks</Link>
      </p>
      <h1>{task.title}</h1>
      <div className="task-card__meta">
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} processing={processing} />
      </div>
      {processing && (
        <p className="muted" role="status">
          Being processed in the background - this page updates automatically.
        </p>
      )}

      <dl className="details">
        <dt>Description</dt>
        <dd>{task.description ?? <span className="muted">No description</span>}</dd>
        <dt>Created</dt>
        <dd>{formatDate(task.createdAt)}</dd>
        <dt>Last updated</dt>
        <dd>{task.updatedAt ? formatDate(task.updatedAt) : "-"}</dd>
        <dt>Processed in background</dt>
        <dd>{task.processedAt ? formatDate(task.processedAt) : "Not yet"}</dd>
      </dl>

      <div className="field field--inline">
        <label htmlFor="status-select">Status</label>
        <select
          id="status-select"
          value={task.status}
          disabled={update.isPending}
          onChange={(e) => update.mutate({ id: task.id, status: e.target.value as TaskStatus })}
        >
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        {update.isPending && <span className="muted">Saving...</span>}
      </div>
      {update.isError && <ErrorAlert message={getErrorMessage(update.error)} />}
    </article>
  );
}
