import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

/** Client-side route guard. The server enforces the same rules — this is only UX. */
export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="container mt"><span className="spinner" /> Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/university'} replace />;
  return children;
}
