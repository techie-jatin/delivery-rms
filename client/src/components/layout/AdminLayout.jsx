/**
 * client/src/components/layout/AdminLayout.jsx
 * Phase 4.1 — Admin panel shell
 * Wraps all /admin/* pages with sidebar navigation.
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './AdminLayout.css';

const NAV = [
  { path: '/admin',          icon: '📊', label: 'Dashboard' },
  { path: '/admin/orders',   icon: '📦', label: 'Orders'    },
  { path: '/admin/products', icon: '🛒', label: 'Products'  },
  { path: '/admin/outlets',  icon: '📍', label: 'Outlets'   },
  { path: '/admin/zones',    icon: '🗺', label: 'Zones'     },
];

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate  = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="adm-shell">
      {/* ── Top bar (mobile) ── */}
      <div className="adm-topbar">
        <button className="adm-topbar__menu" onClick={() => setOpen(!open)}>☰</button>
        <span className="adm-topbar__title">⌖ Admin</span>
        <button className="adm-topbar__back" onClick={() => navigate('/')}>← App</button>
      </div>

      <div className="adm-body">
        {/* ── Sidebar ── */}
        <aside className={`adm-sidebar${open ? ' adm-sidebar--open' : ''}`}>
          <div className="adm-sidebar__logo">⌖ Delivery RMS</div>
          <nav className="adm-sidebar__nav">
            {NAV.map((item) => {
              const active = item.path === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`adm-nav-item${active ? ' adm-nav-item--active' : ''}`}
                  onClick={() => setOpen(false)}
                >
                  <span className="adm-nav-item__icon">{item.icon}</span>
                  <span className="adm-nav-item__label">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <Link to="/" className="adm-sidebar__back">← Back to App</Link>
        </aside>

        {/* ── Main content ── */}
        <main className="adm-main" onClick={() => setOpen(false)}>
          {children}
        </main>
      </div>
    </div>
  );
}
