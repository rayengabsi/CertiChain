import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

/**
 * DashboardLayout — the authenticated shell: sidebar + topbar + content area.
 *
 * Usage:
 *   <DashboardLayout title="Dashboard" breadcrumbs={[…]} showWallet actions={<Button>…</Button>}>
 *     page content
 *   </DashboardLayout>
 */
export default function DashboardLayout({ title, breadcrumbs, actions, showWallet = false, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* Overlay for mobile drawer */}
      <div
        className={`drawer-overlay${sidebarOpen ? ' show' : ''}`}
        aria-hidden="true"
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main">
        <Topbar
          title={title}
          breadcrumbs={breadcrumbs}
          actions={actions}
          showWallet={showWallet}
          onMenuClick={() => setSidebarOpen((o) => !o)}
        />
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
}
