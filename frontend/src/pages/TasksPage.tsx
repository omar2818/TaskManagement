import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import { TASK_STATUSES, type TaskStatus } from "../api/types";
import { PriorityBadge, StatusBadge } from "../components/Badges";
import { CreateTaskForm } from "../components/CreateTaskForm";
import { EmptyState, ErrorState, Spinner } from "../components/StateMessages";
import { useTasks } from "../hooks/useTasks";
import { STATUS_LABELS, formatDate, isAwaitingProcessing } from "../utils/format";

type StatusFilter = "All" | TaskStatus;

export default function TasksPage() {
  const { data, isLoading, isError, error, refetch } = useTasks();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [search, setSearch] = useState("");

  // Filtering happens in the browser; the API order (priority, then creation date) is preserved.
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data ?? []).filter(
      (task) =>
        (statusFilter === "All" || task.status === statusFilter) &&
        (query === "" || task.title.toLowerCase().includes(query)),
    );
  }, [data, statusFilter, search]);

  return (
    <div className="tasks-layout">
      <section aria-labelledby="tasks-heading">
        <h1 id="tasks-heading">My tasks</h1>

        <div className="filters">
          <div className="field">
            <label htmlFor="status-filter">Status</label>
            <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
              <option value="All">All</option>
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <div className="field field--grow">
            <label htmlFor="task-search">Search by title</label>
            <input id="task-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {isLoading && <Spinner label="Loading tasks..." />}
        {isError && <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />}
        {data && data.length === 0 && <EmptyState>You have no tasks yet. Create your first one.</EmptyState>}
        {data && data.length > 0 && visible.length === 0 && <EmptyState>No tasks match your filters.</EmptyState>}

        {visible.length > 0 && (
          <ul className="task-list">
            {visible.map((task) => (
              <li key={task.id} className="task-card">
                <Link to={`/tasks/${task.id}`} className="task-card__title">
                  {task.title}
                </Link>
                <div className="task-card__meta">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} processing={isAwaitingProcessing(task)} />
                  <span className="muted">Created {formatDate(task.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside aria-label="Create task">
        <CreateTaskForm />
      </aside>
    </div>
  );
}
