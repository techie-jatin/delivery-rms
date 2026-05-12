/**
 * client/src/pages/admin/AdminOrders.jsx
 * Phase 4.3 — Admin order management
 * Update order status → customer timeline updates live
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import api from '../../services/api/client';
import './Admin.css';

const STATUSES = ['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

const STATUS_LABELS = {
  confirmed:        'Confirmed',
  preparing:        'Preparing',
  out_for_delivery: 'Out for Delivery',
  delivered:        'Delivered',
  cancelled:        'Cancelled',
};

export default function AdminOrders() {
  const navigate  = useNavigate();
  const [token,   setToken]   = useState('');
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating,setUpdating]= useState(null); // order id being updated
  const [filter,  setFilter]  = useState('all');

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_token');
    if (!saved) { navigate('/admin'); return; }
    setToken(saved);
    loadOrders(saved);
  }, []);

  async function loadOrders(t) {
    setLoading(true);
    try {
      const data = await api.get('/orders', t);
      setOrders(data.orders || []);
    } catch {}
    finally { setLoading(false); }
  }

  async function handleStatusChange(orderId, newStatus) {
    setUpdating(orderId);
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus }, token);
      // Update locally — no need to refetch all
      setOrders((prev) =>
        prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o)
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  }

  const filtered = filter === 'all'
    ? orders
    : orders.filter((o) => o.status === filter);

  return (
    <AdminLayout>
      <div className="adm-page">
        <div className="adm-page__header">
          <h1 className="adm-page__title">Orders</h1>
          <button className="adm-btn adm-btn--primary" onClick={() => loadOrders(token)}>
            ↻ Refresh
          </button>
        </div>

        {/* Filter tabs */}
        <div className="adm-filter-tabs">
          {['all', ...STATUSES].map((s) => (
            <button
              key={s}
              className={`adm-filter-tab${filter === s ? ' adm-filter-tab--active' : ''}`}
              onClick={() => setFilter(s)}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
              <span className="adm-filter-tab__count">
                {s === 'all' ? orders.length : orders.filter((o) => o.status === s).length}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <p className="adm-muted">Loading orders...</p>
        ) : filtered.length === 0 ? (
          <p className="adm-muted">No orders found.</p>
        ) : (
          <div className="adm-order-list">
            {filtered.map((order) => (
              <div key={order.id} className="adm-order-card">
                <div className="adm-order-card__top">
                  <div>
                    <span className="adm-order-card__id">Order #{order.id}</span>
                    <span className="adm-order-card__date">
                      {new Date(order.created_at).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <span className="adm-order-card__total">
                    ₹{parseFloat(order.total).toFixed(0)}
                  </span>
                </div>

                <div className="adm-order-card__address">
                  📍 {order.delivery_address}
                </div>

                <div className="adm-order-card__bottom">
                  <span className={`adm-badge adm-badge--${order.status}`}>
                    {STATUS_LABELS[order.status]}
                  </span>

                  {/* Status update dropdown */}
                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <select
                      className="adm-select"
                      value={order.status}
                      disabled={updating === order.id}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  )}

                  {updating === order.id && (
                    <span className="adm-muted" style={{ fontSize: '0.7rem' }}>Updating...</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
