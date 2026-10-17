import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { getErrorMessage, getFieldError, hasFieldErrors } from "../api/client";
import { authApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { ErrorAlert } from "../components/StateMessages";
import { FormField } from "../components/FormField";
import { LIMITS, validateRegister, type FormErrors } from "../utils/validation";

export default function RegisterPage() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors<"name" | "email" | "password" | "confirmPassword">>({});
  const [serverError, setServerError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === "authenticated") return <Navigate to="/tasks" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validateRegister({ name, email, password, confirmPassword });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setServerError(null);
    try {
      await authApi.register({ name: name.trim(), email: email.trim(), password });
      navigate("/login", { replace: true, state: { registered: true } });
    } catch (error) {
      setServerError(error); // e.g. 409 "Email is already registered." - form input is preserved
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit} noValidate>
        <h1>Create account</h1>
        {Boolean(serverError) && !hasFieldErrors(serverError) && <ErrorAlert message={getErrorMessage(serverError)} />}

        <FormField id="name" label="Name" error={errors.name ?? getFieldError(serverError, "name")}>
          {(p) => <input {...p} autoComplete="name" maxLength={LIMITS.nameMax} value={name} onChange={(e) => setName(e.target.value)} />}
        </FormField>
        <FormField id="email" label="Email" error={errors.email ?? getFieldError(serverError, "email")}>
          {(p) => <input {...p} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </FormField>
        <FormField
          id="password"
          label="Password"
          hint={`At least ${LIMITS.passwordMin} characters.`}
          error={errors.password ?? getFieldError(serverError, "password")}
        >
          {(p) => <input {...p} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </FormField>
        <FormField id="confirmPassword" label="Confirm password" error={errors.confirmPassword}>
          {(p) => (
            <input {...p} type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          )}
        </FormField>

        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? "Creating account..." : "Register"}
        </button>
        <p className="auth-card__switch">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
