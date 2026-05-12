/**
 * client/src/pages/Profile.jsx
 * Phase 3.5 — Profile page
 */

import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useCart } from '../hooks/useCart.jsx';
import './Profile.css';

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { clearCart, token } = useCart();

  if (!user) {
    return (
      <div className="profile-empty">
        <div className="profile-empty__icon">👤</div>
        <p className="profile-empty__text">You're not logged in</p>
        <Link to="/login" className="profile-btn">Login</Link>
        <Link to="/register" className="profile-btn profile-btn--secondary">Create Account</Link>
      </div>
    );
  }

  async function handleLogout() {
    await clearCart(token);
    logout();
    navigate('/');
  }

  return (
    <div className="profile">
      {/* Avatar + name */}
      <div className="profile-hero">
        <div className="profile-hero__avatar">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <h1 className="profile-hero__name">{user.name}</h1>
        <p className="profile-hero__email">{user.email}</p>
        {user.role === 'admin' && (
          <span className="profile-hero__badge">Admin</span>
        )}
      </div>

      {/* Menu items */}
      <div className="profile-menu">
        <Link to="/orders" className="profile-menu__item">
          <span className="profile-menu__icon">📦</span>
          <span className="profile-menu__label">My Orders</span>
          <span className="profile-menu__arrow">›</span>
        </Link>

        {user.role === 'admin' && (
          <Link to="/admin/zones" className="profile-menu__item">
            <span className="profile-menu__icon">🗺</span>
            <span className="profile-menu__label">Delivery Zone Editor</span>
            <span className="profile-menu__arrow">›</span>
          </Link>
        )}

        <div className="profile-menu__divider" />

        <button className="profile-menu__item profile-menu__item--danger" onClick={handleLogout}>
          <span className="profile-menu__icon">🚪</span>
          <span className="profile-menu__label">Logout</span>
        </button>
      </div>

      {/* App info */}
      <div className="profile-footer">
        <p>Delivery RMS · Kota, Rajasthan</p>
        <p>Phase 3 complete ✓</p>
      </div>
    </div>
  );
}
