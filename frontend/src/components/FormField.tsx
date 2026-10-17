import type { ReactNode } from "react";

interface ControlProps {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
}

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: (props: ControlProps) => ReactNode;
}

/** Label + control + inline error, wired together for screen readers. */
export function FormField({ id, label, error, hint, children }: FormFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {error ? (
        <p className="field__error" id={`${id}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
