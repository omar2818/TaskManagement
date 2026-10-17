import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="header">
        <div className="header__inner">
          <span className="brand">Task Manager</span>
          <nav className="nav" aria-label="Main">
            <NavLink to="/tasks">Tasks</NavLink>
            {user?.role === "Admin" && <NavLink to="/admin/users">Users</NavLink>}
          </nav>
          <div className="header__user">
            {user && (
              <span className="header__who">
                {user.name} <span className={`badge badge--role-${user.role.toLowerCase()}`}>{user.role}</span>
              </span>
            )}
            <button type="button" className="btn btn--small" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="container">
        <Outlet />
      </main>
    </>
  );
}
