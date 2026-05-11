/**
 * client/src/pages/Checkout.jsx
 * Phase 3.4 — Checkout flow
 * Address → summary → place order → confirmation
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useCart } from '../hooks/useCart.jsx';
import api from '../services/api/client';
import './Checkout.css';

export default function Checkout() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { items, subtotal, fetchCart } = useCart();

  const [address,  setAddress]  = useState('');
  const [outletId, setOutletId] = useState(1);
  const [placing,  setPlacing]  = useState(false);
  const [error,    setError]    = useState('');
  const [order,    setOrder]    = useState(null); // confirmed order

  const deliveryFee = subtotal >= 499 ? 0 : 40;
  const total       = parseFloat(subtotal) + deliveryFee;

  useEffect(() => {
    if (token) fetchCart(token);
  }, [token]);

  // ── Not logged in ─────────────────────────────────────────────
  if (!user) {
    return (
      <div className="checkout-empty">
        <p>Please <Link to="/login" className="checkout-link">login</Link> to checkout.</p>
      </div>
    );
  }

  // ── Empty cart ────────────────────────────────────────────────
  if (items.length === 0 && !order) {
    return (
      <div className="checkout-empty">
        <p>Your cart is empty. <Link to="/" className="checkout-link">Shop now</Link></p>
      </div>
    );
  }

  // ── Order confirmed screen ────────────────────────────────────
  if (order) {
    return (
      <div className="checkout-confirmed">
        <div className="checkout-confirmed__icon">✓</div>
        <h1 className="checkout-confirmed__title">Order Placed!</h1>
        <p className="checkout-confirmed__sub">Order #{order.id}</p>

        <div className="checkout-confirmed__card">
          <div className="checkout-confirmed__row">
            <span>Total paid</span>
            <span>₹{parseFloat(order.total).toFixed(0)}</span>
          </div>
          <div className="checkout-confirmed__row">
            <span>Delivery to</span>
            <span>{order.delivery_address}</span>
          </div>
          <div className="checkout-confirmed__row">
            <span>ETA</span>
            <span>~{order.eta_minutes} min</span>
          </div>
          <div className="checkout-confirmed__row">
            <span>Status</span>
            <span className="checkout-confirmed__status">
              {order.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        <button
          className="checkout-btn"
          onClick={() => navigate('/orders')}
        >
          Track Order
        </button>
        <button
          className="checkout-btn checkout-btn--secondary"
          onClick={() => navigate('/')}
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  // ── Checkout form ─────────────────────────────────────────────
  async function handlePlaceOrder(e) {
    e.preventDefault();
    if (!address.trim()) {
      setError('Please enter a delivery address.');
      return;
    }
    setError('');
    setPlacing(true);
    try {
      const data = await api.post('/orders', {
        delivery_address: address,
        outlet_id:        outletId,
      }, token);
      setOrder(data.order);
      await fetchCart(token); // refresh cart (now empty)
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="checkout">
      <div className="checkout-header">
        <h1 className="checkout-header__title">Checkout</h1>
      </div>

      <form className="checkout-form" onSubmit={handlePlaceOrder}>
        {/* Delivery address */}
        <div className="checkout-section">
          <div className="checkout-section__title">📍 Delivery Address</div>
          <textarea
            className="checkout-textarea"
            placeholder="Enter your full delivery address..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            required
          />
        </div>

        {/* Order items */}
        <div className="checkout-section">
          <div className="checkout-section__title">🛒 Order Summary</div>
          <div className="checkout-items">
            {items.map((item) => (
              <div key={item.cart_item_id} className="checkout-item">
                <span className="checkout-item__name">
                  {item.product_name} {item.variant_name}
                </span>
                <span className="checkout-item__qty">×{item.quantity}</span>
                <span className="checkout-item__price">
                  ₹{(parseFloat(item.price) * item.quantity).toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bill */}
        <div className="checkout-section">
          <div className="checkout-section__title">💰 Bill</div>
          <div className="checkout-bill">
            <div className="checkout-bill__row">
              <span>Subtotal</span>
              <span>₹{parseFloat(subtotal).toFixed(0)}</span>
            </div>
            <div className="checkout-bill__row">
              <span>Delivery</span>
              <span>
                {deliveryFee === 0
                  ? <span style={{ color: 'var(--color-accent)' }}>FREE</span>
                  : `₹${deliveryFee}`}
              </span>
            </div>
            <div className="checkout-bill__row checkout-bill__row--total">
              <span>Total</span>
              <span>₹{total.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {error && <p className="checkout-error">{error}</p>}

        <button
          className="checkout-btn"
          type="submit"
          disabled={placing}
        >
          {placing ? 'Placing order...' : `Place Order · ₹${total.toFixed(0)}`}
        </button>
      </form>
    </div>
  );
}
