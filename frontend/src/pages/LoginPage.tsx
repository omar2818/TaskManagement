import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ErrorAlert } from "../components/StateMessages";
import { FormField } from "../components/FormField";
import { validateLogin, type FormErrors } from "../utils/validation";

interface LocationState {
  from?: { pathname: string; search?: string };
  registered?: boolean;
}

export default function LoginPage() {
  const { login, status, sessionMessage } = useAuth();
  const state = (useLocation().state ?? null) as LocationState | null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors<"email" | "password">>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already logged in (or just logged in): go back where the user came from, or to the task list.
  if (status === "authenticated") {
    const target = state?.from ? `${state.from.pathname}${state.from.search ?? ""}` : "/tasks";
    return <Navigate to={target} replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validateLogin({ email, password });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setServerError(null);
    try {
      await login({ email: email.trim(), password });
    } catch (error) {
      setServerError(getErrorMessage(error)); // inputs are kept so the user can correct them
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit} noValidate>
        <h1>Log in</h1>
        {state?.registered && <div className="alert alert--ok" role="status">Account created. Please log in.</div>}
        {sessionMessage && <div className="alert alert--warn" role="alert">{sessionMessage}</div>}
        {serverError && <ErrorAlert message={serverError} />}

        <FormField id="email" label="Email" error={errors.email}>
          {(p) => <input {...p} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </FormField>
        <FormField id="password" label="Password" error={errors.password}>
          {(p) => (
            <input {...p} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
        </FormField>

        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? "Logging in..." : "Log in"}
        </button>
        <p className="auth-card__switch">
          No account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}
