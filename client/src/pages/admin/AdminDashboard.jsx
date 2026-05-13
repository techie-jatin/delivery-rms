/**
 * client/src/pages/admin/AdminDashboard.jsx
 * Phase 4.1 + 4.5 — Admin dashboard with stats + charts
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import api from '../../services/api/client';
import './Admin.css';

export default function AdminDashboard() {
  const navigate  = useNavigate();
  const [token,    setToken]    = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_token');
    if (saved) { setToken(saved); loadOrders(saved); }
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginErr('');
    try {
      const data = await api.post('/auth/login', { email, password });
      if (data.user.role !== 'admin') { setLoginErr('Admin access required.'); return; }
      sessionStorage.setItem('admin_token', data.token);
      setToken(data.token);
      loadOrders(data.token);
    } catch (err) { setLoginErr(err.message); }
  }

  async function loadOrders(t) {
    setLoading(true);
    try {
      const data = await api.get('/orders', t);
      setOrders(data.orders || []);
    } catch {} finally { setLoading(false); }
  }

  function handleLogout() {
    sessionStorage.removeItem('admin_token');
    setToken(''); setOrders([]);
  }

  // ── Stats ─────────────────────────────────────────────────────
  const today       = new Date().toDateString();
  const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today);
  const todayRev    = todayOrders.reduce((s, o) => s + parseFloat(o.total), 0);
  const activeOrders= orders.filter((o) => !['delivered','cancelled'].includes(o.status));
  const avgOrder    = orders.length ? orders.reduce((s,o) => s + parseFloat(o.total), 0) / orders.length : 0;

  // ── Orders over last 7 days ───────────────────────────────────
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const dayStr = d.toDateString();
    const dayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === dayStr);
    return {
      date:    label,
      orders:  dayOrders.length,
      revenue: Math.round(dayOrders.reduce((s, o) => s + parseFloat(o.total), 0)),
    };
  });

  // ── Top products by quantity sold ─────────────────────────────
  const productTotals = {};
  for (const order of orders) {
    for (const item of (order.items || [])) {
      const key = item.product_name + ' ' + item.variant_name;
      productTotals[key] = (productTotals[key] || 0) + item.quantity;
    }
  }
  const topProducts = Object.entries(productTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, qty]) => ({ name, qty }));

  const CHART_TOOLTIP = {
    contentStyle: { background: '#13131a', border: '1px solid #2a2a38', borderRadius: '8px', fontFamily: 'Space Mono, monospace', fontSize: '11px' },
    labelStyle: { color: '#f0f0f8' },
    itemStyle: { color: '#00e5a0' },
  };

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
            <div className="adm-stat__value">₹{todayRev.toFixed(0)}</div>
            <div className="adm-stat__label">Revenue Today</div>
          </div>
          <div className="adm-stat adm-stat--alert">
            <div className="adm-stat__value">{activeOrders.length}</div>
            <div className="adm-stat__label">Active Orders</div>
          </div>
          <div className="adm-stat">
            <div className="adm-stat__value">₹{avgOrder.toFixed(0)}</div>
            <div className="adm-stat__label">Avg Order Value</div>
          </div>
        </div>

        {/* Quick links */}
        <div className="adm-quicklinks">
          <Link to="/admin/orders"   className="adm-quicklink">📦 Manage Orders</Link>
          <Link to="/admin/products" className="adm-quicklink">🛒 Manage Products</Link>
          <Link to="/admin/zones"    className="adm-quicklink">🗺 Edit Zones</Link>
        </div>

        {/* Orders over time chart */}
        <div className="adm-section">
          <div className="adm-section__title">Orders — last 7 days</div>
          <div className="adm-chart-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={last7} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
                <XAxis dataKey="date" tick={{ fontFamily: 'Space Mono', fontSize: 10, fill: '#6b6b88' }} />
                <YAxis tick={{ fontFamily: 'Space Mono', fontSize: 10, fill: '#6b6b88' }} allowDecimals={false} />
                <Tooltip {...CHART_TOOLTIP} />
                <Line type="monotone" dataKey="orders" stroke="#00e5a0" strokeWidth={2} dot={{ fill: '#00e5a0', r: 3 }} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue chart */}
        <div className="adm-section">
          <div className="adm-section__title">Revenue (₹) — last 7 days</div>
          <div className="adm-chart-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={last7} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
                <XAxis dataKey="date" tick={{ fontFamily: 'Space Mono', fontSize: 10, fill: '#6b6b88' }} />
                <YAxis tick={{ fontFamily: 'Space Mono', fontSize: 10, fill: '#6b6b88' }} />
                <Tooltip {...CHART_TOOLTIP} formatter={(v) => [`₹${v}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#00e5a0" fillOpacity={0.8} radius={[4,4,0,0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top products */}
        {topProducts.length > 0 && (
          <div className="adm-section">
            <div className="adm-section__title">Top products by units sold</div>
            <div className="adm-chart-wrap">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topProducts} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" horizontal={false} />
                  <XAxis type="number" tick={{ fontFamily: 'Space Mono', fontSize: 10, fill: '#6b6b88' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontFamily: 'Space Mono', fontSize: 9, fill: '#6b6b88' }} width={90} />
                  <Tooltip {...CHART_TOOLTIP} formatter={(v) => [v, 'Units sold']} />
                  <Bar dataKey="qty" fill="#ff4d6d" fillOpacity={0.8} radius={[0,4,4,0]} name="Units" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Recent orders table */}
        <div className="adm-section">
          <div className="adm-section__title">Recent Orders</div>
          {loading ? <p className="adm-muted">Loading...</p> : orders.length === 0 ? (
            <p className="adm-muted">No orders yet.</p>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr><th>#</th><th>Address</th><th>Total</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {orders.slice(0, 10).map((o) => (
                    <tr key={o.id}>
                      <td>#{o.id}</td>
                      <td>{o.delivery_address}</td>
                      <td>₹{parseFloat(o.total).toFixed(0)}</td>
                      <td><span className={`adm-badge adm-badge--${o.status}`}>{o.status.replace(/_/g,' ')}</span></td>
                      <td><Link to="/admin/orders" className="adm-link">Update →</Link></td>
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
