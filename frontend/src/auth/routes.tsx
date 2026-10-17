import { Navigate, Outlet, useLocation } from "react-router-dom";
import { FullPageSpinner } from "../components/StateMessages";
import AccessDeniedPage from "../pages/AccessDeniedPage";
import type { UserRole } from "../api/types";
import { useAuth } from "./AuthContext";

/** Everything below this route requires a logged-in user; otherwise redirect to /login (remembering where we were). */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullPageSpinner />;
  if (status === "anonymous") return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Role gate: a user without the role sees an "Access denied" page instead of the route. */
export function RequireRole({ role }: { role: UserRole }) {
  const { user } = useAuth();
  if (user?.role !== role) return <AccessDeniedPage />;
  return <Outlet />;
}
