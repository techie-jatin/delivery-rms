/**
 * client/src/pages/Cart.jsx
 * Phase 3.4 — Cart page
 */

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useCart } from '../hooks/useCart.jsx';
import './Cart.css';

export default function Cart() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { items, subtotal, itemCount, fetchCart, updateItem, removeItem, loading } = useCart();

  const [feedback, setFeedback] = useState({});

  // Fetch latest cart on mount
  useEffect(() => {
    if (token) fetchCart(token);
  }, [token]);

  // Delivery fee logic (matches backend)
  const deliveryFee    = subtotal >= 499 ? 0 : 40;
  const total          = subtotal + deliveryFee;
  const amountToFree   = Math.max(0, 499 - subtotal);

  async function handleQtyChange(item, newQty) {
    if (newQty < 0) return;
    const result = await updateItem(item.cart_item_id, newQty, token);
    if (!result.success) {
      setFeedback((prev) => ({ ...prev, [item.cart_item_id]: result.error }));
      setTimeout(() => setFeedback((prev) => { const n = {...prev}; delete n[item.cart_item_id]; return n; }), 2500);
    }
  }

  // ── Not logged in ─────────────────────────────────────────────
  if (!user) {
    return (
      <div className="cart-empty">
        <div className="cart-empty__icon">🛒</div>
        <p className="cart-empty__text">Login to view your cart</p>
        <Link to="/login" className="cart-cta">Login</Link>
      </div>
    );
  }

  // ── Empty cart ────────────────────────────────────────────────
  if (!loading && items.length === 0) {
    return (
      <div className="cart-empty">
        <div className="cart-empty__icon">🛒</div>
        <p className="cart-empty__text">Your cart is empty</p>
        <p className="cart-empty__sub">Add some products from the home screen</p>
        <Link to="/" className="cart-cta">Browse products</Link>
      </div>
    );
  }

  return (
    <div className="cart">
      <div className="cart-header">
        <h1 className="cart-header__title">Your Cart</h1>
        <span className="cart-header__count">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
      </div>

      {/* Free delivery nudge */}
      {amountToFree > 0 && (
        <div className="cart-nudge">
          🛵 Add ₹{amountToFree} more for free delivery
        </div>
      )}
      {deliveryFee === 0 && (
        <div className="cart-nudge cart-nudge--free">
          ✓ You get free delivery!
        </div>
      )}

      {/* Items */}
      <div className="cart-items">
        {items.map((item) => (
          <div key={item.cart_item_id} className="cart-item">
            <div className="cart-item__img">🛒</div>

            <div className="cart-item__info">
              <div className="cart-item__name">{item.product_name}</div>
              <div className="cart-item__variant">{item.variant_name} {item.unit}</div>
              <div className="cart-item__price">₹{parseFloat(item.price).toFixed(0)}</div>
              {feedback[item.cart_item_id] && (
                <div className="cart-item__error">{feedback[item.cart_item_id]}</div>
              )}
            </div>

            <div className="cart-item__right">
              <div className="cart-item__controls">
                <button
                  className="cart-item__btn"
                  onClick={() => handleQtyChange(item, item.quantity - 1)}
                  disabled={loading}
                >−</button>
                <span className="cart-item__qty">{item.quantity}</span>
                <button
                  className="cart-item__btn"
                  onClick={() => handleQtyChange(item, item.quantity + 1)}
                  disabled={loading || item.quantity >= item.max_qty_per_order}
                >+</button>
              </div>
              <div className="cart-item__total">
                ₹{(parseFloat(item.price) * item.quantity).toFixed(0)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bill summary */}
      <div className="cart-bill">
        <div className="cart-bill__title">Bill Summary</div>
        <div className="cart-bill__row">
          <span>Subtotal</span>
          <span>₹{parseFloat(subtotal).toFixed(0)}</span>
        </div>
        <div className="cart-bill__row">
          <span>Delivery fee</span>
          <span>{deliveryFee === 0 ? <span className="cart-bill__free">FREE</span> : `₹${deliveryFee}`}</span>
        </div>
        <div className="cart-bill__row cart-bill__row--total">
          <span>Total</span>
          <span>₹{total.toFixed(0)}</span>
        </div>
      </div>

      {/* Checkout button */}
      <div className="cart-footer">
        <button
          className="cart-checkout-btn"
          onClick={() => navigate('/checkout')}
          disabled={items.length === 0}
        >
          Proceed to Checkout · ₹{total.toFixed(0)}
        </button>
      </div>
    </div>
  );
}
