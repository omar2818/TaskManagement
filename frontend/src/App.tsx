import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, RequireRole } from "./auth/routes";
import Layout from "./components/Layout";
import AdminUsersPage from "./pages/AdminUsersPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import RegisterPage from "./pages/RegisterPage";
import TaskDetailsPage from "./pages/TaskDetailsPage";
import TasksPage from "./pages/TasksPage";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Requires login */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/tasks" replace />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/tasks/:id" element={<TaskDetailsPage />} />

          {/* Requires the Admin role */}
          <Route element={<RequireRole role="Admin" />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
