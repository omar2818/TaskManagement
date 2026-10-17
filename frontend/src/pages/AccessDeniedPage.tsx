import { Link } from "react-router-dom";

export default function AccessDeniedPage() {
  return (
    <div className="state state--error" role="alert">
      <h1>Access denied</h1>
      <p>You don't have permission to view this page.</p>
      <Link to="/tasks">Back to my tasks</Link>
    </div>
  );
}
