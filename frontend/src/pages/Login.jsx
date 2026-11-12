import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn } from 'lucide-react';
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
    <div
      className="container narrow login-container"
      style={{ padding: '48px 24px 64px' }}
    >
      {/* ── Page heading ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '5px 14px',
            borderRadius: 'var(--r-full)',
            border: '1px solid rgba(121,92,255,0.4)',
            background: 'var(--accent-soft)',
            color: '#d3caff',
            fontSize: 'var(--fs-xs)',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          <Lock size={11} /> Secure access
        </span>
        <h1
          style={{
            fontSize: 'clamp(22px, 4vw, 30px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginBottom: 8,
          }}
        >
          Institution Login
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', margin: 0 }}>
          Platform administrators and authorized universities.
        </p>
      </div>

      {/* ── Login form ────────────────────────────────────────────────────── */}
      <div className="card">
        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              placeholder="you@university.edu"
              aria-required="true"
            />
          </div>

          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Your password"
              aria-required="true"
            />
          </div>

          {error && (
            <div className="alert error" role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          <div className="btn-row" style={{ marginTop: 20 }}>
            <button
              className="btn block"
              type="submit"
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {loading ? (
                <span className="spinner" aria-hidden="true" />
              ) : (
                <LogIn size={16} aria-hidden="true" />
              )}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>

      <p className="muted small mt">
        Sessions are stored in <span className="mono">sessionStorage</span> and expire with the
        tab. Login is rate-limited server-side.
      </p>
    </div>
  );
}
