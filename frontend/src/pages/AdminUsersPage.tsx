import { useState, type FormEvent } from "react";
import { getErrorMessage, getFieldError, hasFieldErrors } from "../api/client";
import type { UserResponse, UserRole } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { FormField } from "../components/FormField";
import { ErrorAlert, ErrorState, Spinner } from "../components/StateMessages";
import { useCreateUser, useDeleteUser, useUsers } from "../hooks/useUsers";
import { formatDate } from "../utils/format";
import { LIMITS, validateCreateUser, type FormErrors } from "../utils/validation";

function CreateUserForm() {
  const create = useCreateUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("User");
  const [errors, setErrors] = useState<FormErrors<"name" | "email" | "password">>({});
  const [serverError, setServerError] = useState<unknown>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validateCreateUser({ name, email, password });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setServerError(null);
    try {
      await create.mutateAsync({ name: name.trim(), email: email.trim(), password, role });
      setName("");
      setEmail("");
      setPassword("");
      setRole("User");
    } catch (error) {
      setServerError(error);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} noValidate>
      <h2>Create user</h2>
      {Boolean(serverError) && !hasFieldErrors(serverError) && <ErrorAlert message={getErrorMessage(serverError)} />}
      {create.isSuccess && !serverError && (
        <div className="alert alert--ok" role="status">
          User created.
        </div>
      )}
      <FormField id="new-name" label="Name" error={errors.name ?? getFieldError(serverError, "name")}>
        {(p) => <input {...p} maxLength={LIMITS.nameMax} value={name} onChange={(e) => setName(e.target.value)} />}
      </FormField>
      <FormField id="new-email" label="Email" error={errors.email ?? getFieldError(serverError, "email")}>
        {(p) => <input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
      </FormField>
      <FormField
        id="new-password"
        label="Password"
        hint={`At least ${LIMITS.passwordMin} characters.`}
        error={errors.password ?? getFieldError(serverError, "password")}
      >
        {(p) => <input {...p} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
      </FormField>
      <FormField id="new-role" label="Role">
        {(p) => (
          <select {...p} value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value="User">User</option>
            <option value="Admin">Admin</option>
          </select>
        )}
      </FormField>
      <button type="submit" className="btn btn--primary" disabled={create.isPending}>
        {create.isPending ? "Creating..." : "Create user"}
      </button>
    </form>
  );
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { data, isLoading, isError, error, refetch } = useUsers();
  const remove = useDeleteUser();
  const [target, setTarget] = useState<UserResponse | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function closeDialog() {
    setTarget(null);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!target) return;
    try {
      await remove.mutateAsync(target.id);
      closeDialog();
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    }
  }

  return (
    <div className="tasks-layout">
      <section aria-labelledby="users-heading">
        <h1 id="users-heading">Users</h1>
        {isLoading && <Spinner label="Loading users..." />}
        {isError && <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />}
        {data && (
          <div className="table-wrap">
            <table>
              <caption className="sr-only">All users</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Created</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge badge--role-${u.role.toLowerCase()}`}>{u.role}</span>
                    </td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td>
                      {u.id === currentUser?.id ? (
                        <span className="muted">You</span>
                      ) : (
                        <button type="button" className="btn btn--small btn--danger" onClick={() => setTarget(u)}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <aside aria-label="Create user">
        <CreateUserForm />
      </aside>

      <ConfirmDialog
        open={target !== null}
        title="Delete user?"
        message={target ? `${target.name} (${target.email}) will no longer be able to log in.` : ""}
        confirmLabel="Delete"
        busy={remove.isPending}
        error={deleteError}
        onConfirm={() => void confirmDelete()}
        onCancel={closeDialog}
      />
    </div>
  );
}
