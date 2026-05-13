/**
 * client/src/pages/Orders.jsx
 * Phase 3.6 + 5.1 — Order history + live status + reorder
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useCart } from '../hooks/useCart.jsx';
import api from '../services/api/client';
import './Orders.css';

const STATUS_STEPS  = ['confirmed', 'preparing', 'out_for_delivery', 'delivered'];
const STATUS_LABELS = {
  confirmed: 'Order Confirmed', preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled',
};
const STATUS_ICONS = {
  confirmed: '✓', preparing: '👨‍🍳', out_for_delivery: '🛵',
  delivered: '📦', cancelled: '✕',
};

export default function Orders() {
  const { user, token } = useAuth();
  const { addItem }     = useCart();
  const navigate        = useNavigate();

  const [orders,    setOrders]    = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [reordering,setReordering]= useState(null); // order id being reordered

  const loadOrders = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get('/orders', token);
      setOrders(data.orders);
    } catch {}
  }, [token]);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    loadOrders().finally(() => setLoading(false));
  }, [token]);

  // Poll every 30s for active orders
  useEffect(() => {
    const hasActive = orders.some((o) => !['delivered','cancelled'].includes(o.status));
    if (!hasActive) return;
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, [orders, loadOrders]);

  // ── Reorder with 1 tap ────────────────────────────────────────
  async function handleReorder(order) {
    if (!order.items || !order.items.length) return;
    setReordering(order.id);
    let added = 0;
    let failed = [];

    for (const item of order.items) {
      const result = await addItem(item.variant_id, item.quantity, token);
      if (result.success) {
        added++;
      } else {
        failed.push(item.product_name);
      }
    }

    setReordering(null);

    if (added > 0) {
      navigate('/cart');
    } else {
      alert(`Could not reorder: ${failed.join(', ')} — items may be out of stock or at max limit.`);
    }
  }

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
    return <div className="orders-empty"><span className="orders-spinner" /></div>;
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

            {selected === order.id && (
              <div className="order-card__detail">
                {/* Status timeline */}
                {order.status !== 'cancelled' && (
                  <div className="order-timeline">
                    {STATUS_STEPS.map((step, i) => {
                      const currentIdx = STATUS_STEPS.indexOf(order.status);
                      const isDone   = i <= currentIdx;
                      const isActive = i === currentIdx;
                      return (
                        <div key={step} className={`order-timeline__step${isDone ? ' done' : ''}${isActive ? ' active' : ''}`}>
                          <div className="order-timeline__dot">{isDone ? '✓' : (i + 1)}</div>
                          <div className="order-timeline__label">{STATUS_LABELS[step]}</div>
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

                {/* Info */}
                <div className="order-info">
                  <div className="order-info__row"><span>Address</span><span>{order.delivery_address}</span></div>
                  {order.eta_minutes && order.status !== 'delivered' && (
                    <div className="order-info__row"><span>ETA</span><span>~{order.eta_minutes} min</span></div>
                  )}
                  <div className="order-info__row"><span>Subtotal</span><span>₹{parseFloat(order.subtotal).toFixed(0)}</span></div>
                  <div className="order-info__row">
                    <span>Delivery</span>
                    <span>{parseFloat(order.delivery_fee) === 0
                      ? <span style={{ color: 'var(--color-accent)' }}>FREE</span>
                      : `₹${parseFloat(order.delivery_fee).toFixed(0)}`}
                    </span>
                  </div>
                  <div className="order-info__row order-info__row--total">
                    <span>Total</span><span>₹{parseFloat(order.total).toFixed(0)}</span>
                  </div>
                </div>

                {/* ── Reorder button ── */}
                <button
                  className="order-reorder-btn"
                  onClick={() => handleReorder(order)}
                  disabled={reordering === order.id}
                >
                  {reordering === order.id ? 'Adding to cart...' : '🔄 Reorder'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
