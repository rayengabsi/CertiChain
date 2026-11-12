import { NavLink } from 'react-router-dom';
import Logo from './Logo.jsx';

/**
 * PublicLayout — header + main + footer for unauthenticated pages.
 * Pages: Landing, VerifyPage.
 */
export default function PublicLayout({ children }) {
  return (
    <div className="public-shell">
      {/* Skip-to-main link */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <header className="public-header">
        <div className="container public-header-inner">
          <Logo />
          <nav className="public-nav" aria-label="Public navigation">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Home
            </NavLink>
            <NavLink
              to="/verify/lookup"
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              Verify
            </NavLink>
            <NavLink to="/login" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Sign in
            </NavLink>
          </nav>
        </div>
      </header>

      <main id="main-content" className="public-main" tabIndex={-1}>{children}</main>

      <footer className="public-footer">
        <div className="container">
          <div className="pf-grid">
            <span>
              © {new Date().getFullYear()} CertiChain — blockchain-anchored diploma verification.
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-dim)' }}>
              Hardhat Localhost · chainId 31337
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
