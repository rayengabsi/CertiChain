import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  Building2,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LogOut,
  ScanSearch,
  Settings as SettingsIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { initials } from '../../lib/format.js';
import Logo from './Logo.jsx';

/**
 * Role-aware navigation.
 * Items are grouped with `section` headers; the rest are links.
 * NOTE: entries are added as their pages land in later stages.
 */
function navFor(role) {
  if (role === 'admin') {
    return [
      { section: 'Platform' },
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      // Stage 3 adds: Universities (/admin/universities), Activity (/admin/activity)
    ];
  }
  return [
    { section: 'Workspace' },
    { to: '/university', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/university/issue', label: 'Issue Certificate', icon: FilePlus2 },
    { to: '/university/certificates', label: 'Certificates', icon: FileText },
  ];
}

const SHARED = [
  { section: 'General' },
  { to: '/', label: 'Verification', icon: ScanSearch, end: true },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = [...navFor(user?.role), ...SHARED];

  function onLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <aside
      className={`sidebar ${open ? 'open' : ''}`.trim()}
      aria-label="Primary navigation"
      style={{ position: 'relative' }}
    >
      <div className="sidebar-brand">
        <Logo />
        {/* Close button — only visible on mobile when drawer is open */}
        <button
          className="sidebar-close"
          onClick={onClose}
          aria-label="Close navigation"
          type="button"
        >
          <X size={16} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {items.map((it, i) =>
          it.section ? (
            <div key={`section-${i}`} className="nav-section">
              {it.section}
            </div>
          ) : (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              onClick={onClose}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <it.icon size={18} strokeWidth={2} />
              {it.label}
            </NavLink>
          )
        )}
      </nav>

      <div className="sidebar-foot">
        <div className="sidebar-user">
          <span className="avatar" aria-hidden="true">
            {initials(user?.fullName || user?.email || '')}
          </span>
          <div className="su-meta">
            <div className="su-name" title={user?.email}>
              {user?.fullName || user?.email}
            </div>
            <div className="su-role">{user?.role}</div>
          </div>
          <button className="icon-btn" onClick={onLogout} aria-label="Log out" title="Log out" type="button">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
