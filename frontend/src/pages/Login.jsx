import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { errorMessage } from '../api/client.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin' : '/university', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container narrow">
      <h1 className="page-title">Institution login</h1>
      <p className="page-sub">Platform administrators and authorized universities.</p>

      <div className="card">
        <form onSubmit={onSubmit}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && <div className="alert error">{error}</div>}

          <div className="btn-row">
            <button className="btn" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : '🔐'} Log in
            </button>
          </div>
        </form>
      </div>

      <p className="muted small mt">
        Sessions are stored in <span className="mono">sessionStorage</span> and expire with the tab. Login is
        rate-limited server-side.
      </p>
    </div>
  );
}
