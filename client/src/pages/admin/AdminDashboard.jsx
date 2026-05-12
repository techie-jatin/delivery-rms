/**
 * client/src/pages/admin/AdminDashboard.jsx
 * Phase 4.1 — Admin dashboard with stats + recent orders
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import api from '../../services/api/client';
import './Admin.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [token,   setToken]   = useState('');
  const [email,   setEmail]   = useState('');
  const [password,setPassword]= useState('');
  const [loginErr,setLoginErr]= useState('');
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(false);

  // Check if already logged in (stored in sessionStorage for admin)
  useEffect(() => {
    const saved = sessionStorage.getItem('admin_token');
    if (saved) { setToken(saved); loadOrders(saved); }
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginErr('');
    try {
      const data = await api.post('/auth/login', { email, password });
      if (data.user.role !== 'admin') {
        setLoginErr('Admin access required.');
        return;
      }
      sessionStorage.setItem('admin_token', data.token);
      setToken(data.token);
      loadOrders(data.token);
    } catch (err) {
      setLoginErr(err.message);
    }
  }

  async function loadOrders(t) {
    setLoading(true);
    try {
      const data = await api.get('/orders', t);
      // Admin sees all orders — for now filtered by user
      // Phase 4.3 will add admin-specific endpoint
      setOrders(data.orders || []);
    } catch {}
    finally { setLoading(false); }
  }

  function handleLogout() {
    sessionStorage.removeItem('admin_token');
    setToken('');
    setOrders([]);
  }

  // ── Login screen ──────────────────────────────────────────────
  if (!token) {
    return (
      <div className="adm-login">
        <h1 className="adm-login__title">⌖ Admin Login</h1>
        <form className="adm-login__form" onSubmit={handleLogin}>
          <input className="adm-input" type="email" placeholder="Admin email"
            value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          <input className="adm-input" type="password" placeholder="Password"
            value={password} onChange={(e) => setPassword(e.target.value)} required />
          {loginErr && <p className="adm-error">{loginErr}</p>}
          <button className="adm-btn adm-btn--primary" type="submit">Login</button>
        </form>
        <Link to="/" className="adm-login__back">← Back to app</Link>
      </div>
    );
  }

  // ── Stats ─────────────────────────────────────────────────────
  const today = new Date().toDateString();
  const todayOrders  = orders.filter((o) => new Date(o.created_at).toDateString() === today);
  const todayRevenue = todayOrders.reduce((s, o) => s + parseFloat(o.total), 0);
  const activeOrders = orders.filter((o) => !['delivered','cancelled'].includes(o.status));

  return (
    <AdminLayout>
      <div className="adm-page">
        <div className="adm-page__header">
          <h1 className="adm-page__title">Dashboard</h1>
          <button className="adm-btn adm-btn--ghost" onClick={handleLogout}>Logout</button>
        </div>

        {/* Stat cards */}
        <div className="adm-stats">
          <div className="adm-stat">
            <div className="adm-stat__value">{todayOrders.length}</div>
            <div className="adm-stat__label">Orders Today</div>
          </div>
          <div className="adm-stat">
            <div className="adm-stat__value">₹{todayRevenue.toFixed(0)}</div>
            <div className="adm-stat__label">Revenue Today</div>
          </div>
          <div className="adm-stat adm-stat--alert">
            <div className="adm-stat__value">{activeOrders.length}</div>
            <div className="adm-stat__label">Active Orders</div>
          </div>
          <div className="adm-stat">
            <div className="adm-stat__value">{orders.length}</div>
            <div className="adm-stat__label">Total Orders</div>
          </div>
        </div>

        {/* Quick links */}
        <div className="adm-quicklinks">
          <Link to="/admin/orders"   className="adm-quicklink">📦 Manage Orders</Link>
          <Link to="/admin/products" className="adm-quicklink">🛒 Manage Products</Link>
          <Link to="/admin/zones"    className="adm-quicklink">🗺 Edit Zones</Link>
        </div>

        {/* Recent orders */}
        <div className="adm-section">
          <div className="adm-section__title">Recent Orders</div>
          {loading ? (
            <p className="adm-muted">Loading...</p>
          ) : orders.length === 0 ? (
            <p className="adm-muted">No orders yet.</p>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Address</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 10).map((o) => (
                    <tr key={o.id}>
                      <td>#{o.id}</td>
                      <td>{o.delivery_address}</td>
                      <td>₹{parseFloat(o.total).toFixed(0)}</td>
                      <td>
                        <span className={`adm-badge adm-badge--${o.status}`}>
                          {o.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <Link to="/admin/orders" className="adm-link">Update →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
