import { useState, type FormEvent } from "react";
import { getErrorMessage, getFieldError, hasFieldErrors } from "../api/client";
import { TASK_PRIORITIES, type TaskPriority } from "../api/types";
import { useCreateTask } from "../hooks/useTasks";
import { LIMITS, validateTask, type FormErrors } from "../utils/validation";
import { FormField } from "./FormField";
import { ErrorAlert } from "./StateMessages";

export function CreateTaskForm() {
  const create = useCreateTask();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [errors, setErrors] = useState<FormErrors<"title" | "description">>({});
  const [serverError, setServerError] = useState<unknown>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validateTask({ title, description });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setServerError(null);
    try {
      await create.mutateAsync({ title: title.trim(), description: description.trim(), priority });
      setTitle("");
      setDescription("");
      setPriority("Medium");
    } catch (error) {
      setServerError(error); // keep what the user typed (e.g. after the duplicate-title 409)
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} noValidate>
      <h2>New task</h2>
      {Boolean(serverError) && !hasFieldErrors(serverError) && <ErrorAlert message={getErrorMessage(serverError)} />}
      {create.isSuccess && !serverError && (
        <div className="alert alert--ok" role="status">
          Task created. It will be processed in the background.
        </div>
      )}

      <FormField id="task-title" label="Title" error={errors.title ?? getFieldError(serverError, "title")}>
        {(p) => <input {...p} maxLength={LIMITS.titleMax} value={title} onChange={(e) => setTitle(e.target.value)} />}
      </FormField>
      <FormField
        id="task-description"
        label="Description (optional)"
        hint={`${description.length}/${LIMITS.descriptionMax}`}
        error={errors.description ?? getFieldError(serverError, "description")}
      >
        {(p) => <textarea {...p} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />}
      </FormField>
      <FormField id="task-priority" label="Priority">
        {(p) => (
          <select {...p} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
            {TASK_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <button type="submit" className="btn btn--primary" disabled={create.isPending}>
        {create.isPending ? "Creating..." : "Create task"}
      </button>
    </form>
  );
}
