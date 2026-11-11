import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function NavBar() {
  const { user, isAdmin, isUniversity, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand">
          <span className="logo">⛓</span> CertiChain
        </Link>
        <div className="nav-links">
          <NavLink to="/" end>
            Verify
          </NavLink>
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
          {isUniversity && <NavLink to="/university">Dashboard</NavLink>}
          {user ? (
            <>
              <span className="badge brand">{user.role}</span>
              <span className="muted small">{user.email}</span>
              <button
                className="btn ghost small"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <NavLink to="/login">Log in</NavLink>
          )}
        </div>
      </div>
    </nav>
  );
}
