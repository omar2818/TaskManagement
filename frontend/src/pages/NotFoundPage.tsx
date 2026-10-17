import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>Page not found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <Link to="/tasks">Go to my tasks</Link>
      </div>
    </div>
  );
}
