/**
 * client/src/components/layout/Layout.jsx
 * Phase 3.1 — App shell
 *
 * Wraps every customer-facing page with:
 *   - Top header (logo + cart icon + profile)
 *   - Bottom navigation bar (mobile-first)
 *
 * Usage: wrap pages in App.jsx with <Layout>
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart.jsx';
import { useAuth } from '../../hooks/useAuth.jsx';
import './Layout.css';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate  = useNavigate();
  const { itemCount } = useCart();
  const { user }      = useAuth();

  const nav = [
    { path: '/',        icon: '🏠', label: 'Home'    },
    { path: '/orders',  icon: '📦', label: 'Orders'  },
    { path: '/profile', icon: '👤', label: 'Profile' },
  ];

  return (
    <div className="layout">
      {/* ── Top header ── */}
      <header className="layout-header">
        <Link to="/" className="layout-header__logo">
          🛒 <span>Delivery RMS</span>
        </Link>

        <div className="layout-header__right">
          {/* Cart icon with item count badge */}
          <button
            className="layout-header__cart"
            onClick={() => navigate('/cart')}
            aria-label="Cart"
          >
            🛒
            {itemCount > 0 && (
              <span className="layout-header__badge">{itemCount}</span>
            )}
          </button>

          {/* Profile / Login */}
          {user ? (
            <Link to="/profile" className="layout-header__profile">
              {user.name.charAt(0).toUpperCase()}
            </Link>
          ) : (
            <Link to="/login" className="layout-header__login">
              Login
            </Link>
          )}
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="layout-main">
        {children}
      </main>

      {/* ── Bottom nav (mobile) ── */}
      <nav className="layout-nav">
        {nav.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`layout-nav__item${location.pathname === item.path ? ' layout-nav__item--active' : ''}`}
          >
            <span className="layout-nav__icon">{item.icon}</span>
            <span className="layout-nav__label">{item.label}</span>
          </Link>
        ))}
        <button
          className={`layout-nav__item${location.pathname === '/cart' ? ' layout-nav__item--active' : ''}`}
          onClick={() => navigate('/cart')}
        >
          <span className="layout-nav__icon">
            🛒
            {itemCount > 0 && (
              <span className="layout-nav__dot" />
            )}
          </span>
          <span className="layout-nav__label">Cart</span>
        </button>
      </nav>
    </div>
  );
}
