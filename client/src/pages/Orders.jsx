/**
 * client/src/pages/Orders.jsx
 * Phase 3.6 — Order history + live status tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../services/api/client';
import './Orders.css';

const STATUS_STEPS = ['confirmed', 'preparing', 'out_for_delivery', 'delivered'];

const STATUS_LABELS = {
  confirmed:        'Order Confirmed',
  preparing:        'Preparing',
  out_for_delivery: 'Out for Delivery',
  delivered:        'Delivered',
  cancelled:        'Cancelled',
};

const STATUS_ICONS = {
  confirmed:        '✓',
  preparing:        '👨‍🍳',
  out_for_delivery: '🛵',
  delivered:        '📦',
  cancelled:        '✕',
};

export default function Orders() {
  const { user, token } = useAuth();
  const navigate        = useNavigate();

  const [orders,   setOrders]   = useState([]);
  const [selected, setSelected] = useState(null); // expanded order id
  const [loading,  setLoading]  = useState(true);

  const loadOrders = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get('/orders', token);
      setOrders(data.orders);
    } catch {}
  }, [token]);

  // Initial load
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    loadOrders().finally(() => setLoading(false));
  }, [token]);

  // Poll every 30s for status updates on active orders
  useEffect(() => {
    const hasActive = orders.some(
      (o) => o.status !== 'delivered' && o.status !== 'cancelled'
    );
    if (!hasActive) return;
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, [orders, loadOrders]);

  // ── Not logged in ─────────────────────────────────────────────
  if (!user) {
    return (
      <div className="orders-empty">
        <div className="orders-empty__icon">📦</div>
        <p>Login to see your orders</p>
        <button className="orders-cta" onClick={() => navigate('/login')}>Login</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="orders-empty">
        <span className="orders-spinner" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="orders-empty">
        <div className="orders-empty__icon">📦</div>
        <p className="orders-empty__text">No orders yet</p>
        <p className="orders-empty__sub">Your orders will appear here</p>
        <button className="orders-cta" onClick={() => navigate('/')}>Start Shopping</button>
      </div>
    );
  }

  return (
    <div className="orders">
      <div className="orders-header">
        <h1 className="orders-header__title">Your Orders</h1>
      </div>

      <div className="orders-list">
        {orders.map((order) => (
          <div key={order.id} className="order-card">
            {/* Order summary row */}
            <div
              className="order-card__summary"
              onClick={() => setSelected(selected === order.id ? null : order.id)}
            >
              <div className="order-card__left">
                <div className="order-card__id">Order #{order.id}</div>
                <div className="order-card__date">
                  {new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>
              <div className="order-card__right">
                <div className="order-card__total">₹{parseFloat(order.total).toFixed(0)}</div>
                <div className={`order-card__status order-card__status--${order.status}`}>
                  {STATUS_ICONS[order.status]} {STATUS_LABELS[order.status]}
                </div>
              </div>
            </div>

            {/* Expanded detail */}
            {selected === order.id && (
              <div className="order-card__detail">
                {/* Status timeline */}
                {order.status !== 'cancelled' && (
                  <div className="order-timeline">
                    {STATUS_STEPS.map((step, i) => {
                      const currentIdx = STATUS_STEPS.indexOf(order.status);
                      const isDone     = i <= currentIdx;
                      const isActive   = i === currentIdx;
                      return (
                        <div key={step} className={`order-timeline__step${isDone ? ' done' : ''}${isActive ? ' active' : ''}`}>
                          <div className="order-timeline__dot">
                            {isDone ? '✓' : (i + 1)}
                          </div>
                          <div className="order-timeline__label">
                            {STATUS_LABELS[step]}
                          </div>
                          {i < STATUS_STEPS.length - 1 && (
                            <div className={`order-timeline__line${isDone ? ' done' : ''}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {order.status === 'cancelled' && (
                  <div className="order-cancelled">Order was cancelled</div>
                )}

                {/* Delivery info */}
                <div className="order-info">
                  <div className="order-info__row">
                    <span>Address</span>
                    <span>{order.delivery_address}</span>
                  </div>
                  {order.eta_minutes && order.status !== 'delivered' && (
                    <div className="order-info__row">
                      <span>ETA</span>
                      <span>~{order.eta_minutes} min</span>
                    </div>
                  )}
                  <div className="order-info__row">
                    <span>Subtotal</span>
                    <span>₹{parseFloat(order.subtotal).toFixed(0)}</span>
                  </div>
                  <div className="order-info__row">
                    <span>Delivery</span>
                    <span>
                      {parseFloat(order.delivery_fee) === 0
                        ? <span style={{ color: 'var(--color-accent)' }}>FREE</span>
                        : `₹${parseFloat(order.delivery_fee).toFixed(0)}`}
                    </span>
                  </div>
                  <div className="order-info__row order-info__row--total">
                    <span>Total</span>
                    <span>₹{parseFloat(order.total).toFixed(0)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
