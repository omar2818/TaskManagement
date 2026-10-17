import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** In-page modal built on the native <dialog> element (focus trap + Esc handled by the browser). */
export function ConfirmDialog({ open, title, message, confirmLabel, busy = false, error, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id="confirm-title">{title}</h2>
      <p>{message}</p>
      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}
      <div className="dialog__actions">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn btn--danger" onClick={onConfirm} disabled={busy}>
          {busy ? "Working..." : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
