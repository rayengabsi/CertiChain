import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Settings, User } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { initials } from '../../lib/format.js';
import Breadcrumbs from './Breadcrumbs.jsx';
import WalletChip from './WalletChip.jsx';

/**
 * Topbar — sticky header for authenticated pages.
 *
 * Props:
 *   title        — page h1 string
 *   breadcrumbs  — [{ label, to? }] passed to <Breadcrumbs>
 *   actions      — optional JSX rendered on the right (e.g. a CTA button)
 *   showWallet   — set true on pages that need the wallet chip
 *   onMenuClick  — called when the mobile hamburger is clicked
 */
export default function Topbar({ title, breadcrumbs, actions, showWallet = false, onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close account menu when clicking outside.
  useEffect(() => {
    if (!menuOpen) return;
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate('/', { replace: true });
  }

  return (
    <header className="topbar" role="banner">
      {/* Mobile menu toggle */}
      <button
        className="icon-btn menu-btn"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        type="button"
      >
        <Menu size={20} />
      </button>

      {/* Title + breadcrumbs */}
      <div className="topbar-title">
        {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
        {title ? <h1>{title}</h1> : null}
      </div>

      {/* Right-side actions */}
      <div className="topbar-actions">
        {actions}
        {showWallet ? <WalletChip /> : null}

        {/* Account avatar menu */}
        <div className="menu-wrap" ref={menuRef}>
          <button
            className="avatar"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Account menu"
            aria-expanded={menuOpen}
            type="button"
            title={user?.email}
          >
            {initials(user?.fullName || user?.email || '')}
          </button>

          {menuOpen && (
            <div className="account-menu" role="menu">
              <div className="am-head">
                <div className="am-email">{user?.fullName || user?.email}</div>
                <div className="am-role">{user?.role}</div>
              </div>
              <Link
                to="/settings"
                className="menu-item"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                <Settings size={15} /> Settings
              </Link>
              <button className="menu-item danger" role="menuitem" onClick={handleLogout} type="button">
                <LogOut size={15} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
