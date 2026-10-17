import type { ReactNode } from "react";

export function Spinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="full-page">
      <Spinner />
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="state state--empty">{children}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state--error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="alert alert--error" role="alert">
      {message}
    </div>
  );
}
