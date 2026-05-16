/**
 * client/src/pages/Checkout.jsx
 * Phase 6 — Checkout with Razorpay + COD
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

  const [address,       setAddress]       = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod'); // 'cod' | 'online'
  const [outletId,      setOutletId]      = useState(1);
  const [placing,       setPlacing]       = useState(false);
  const [error,         setError]         = useState('');
  const [order,         setOrder]         = useState(null);

  const deliveryFee = subtotal >= 499 ? 0 : 40;
  const total       = parseFloat(subtotal) + deliveryFee;

  useEffect(() => {
    if (token) fetchCart(token);
  }, [token]);

  if (!user) {
    return (
      <div className="checkout-empty">
        <p>Please <Link to="/login" className="checkout-link">login</Link> to checkout.</p>
      </div>
    );
  }

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
          <div className="checkout-confirmed__row"><span>Total paid</span><span>₹{parseFloat(order.total).toFixed(0)}</span></div>
          <div className="checkout-confirmed__row"><span>Payment</span><span>{order.payment_method === 'online' ? '✓ Paid Online' : 'Cash on Delivery'}</span></div>
          <div className="checkout-confirmed__row"><span>Delivery to</span><span>{order.delivery_address}</span></div>
          <div className="checkout-confirmed__row"><span>ETA</span><span>~{order.eta_minutes} min</span></div>
          <div className="checkout-confirmed__row"><span>Status</span><span className="checkout-confirmed__status">{order.status}</span></div>
        </div>
        <button className="checkout-btn" onClick={() => navigate('/orders')}>Track Order</button>
        <button className="checkout-btn checkout-btn--secondary" onClick={() => navigate('/')}>Continue Shopping</button>
      </div>
    );
  }

  // ── COD order ─────────────────────────────────────────────────
  async function handleCOD() {
    if (!address.trim()) { setError('Please enter a delivery address.'); return; }
    setError(''); setPlacing(true);
    try {
      const data = await api.post('/orders', { delivery_address: address, outlet_id: outletId }, token);
      setOrder(data.order);
      await fetchCart(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  }

  // ── Razorpay online payment ───────────────────────────────────
  async function handleOnlinePayment() {
    if (!address.trim()) { setError('Please enter a delivery address.'); return; }
    setError(''); setPlacing(true);

    try {
      // Step 1: Create Razorpay order on backend
      const orderData = await api.post('/payments/create-order', {
        delivery_address: address,
        outlet_id: outletId,
      }, token);

      // Step 2: Open Razorpay popup
      const options = {
        key:         orderData.key_id,
        amount:      orderData.amount,
        currency:    orderData.currency,
        name:        'Haat Delivery',
        description: 'Grocery Order',
        order_id:    orderData.razorpay_order_id,
        prefill:     orderData.prefill,
        theme:       { color: '#00e5a0' },

        handler: async function (response) {
          // Step 3: Verify payment on backend → creates DB order
          try {
            const verified = await api.post('/payments/verify', {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              delivery_address:    address,
              outlet_id:           outletId,
            }, token);
            setOrder(verified.order);
            await fetchCart(token);
          } catch (err) {
            setError('Payment succeeded but order creation failed. Contact support with payment ID: ' + response.razorpay_payment_id);
          } finally {
            setPlacing(false);
          }
        },

        modal: {
          ondismiss: () => {
            setPlacing(false);
            setError('Payment cancelled.');
          },
        },
      };

      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      setError(err.message);
      setPlacing(false);
    }
  }

  function handlePlaceOrder(e) {
    e.preventDefault();
    if (paymentMethod === 'online') {
      handleOnlinePayment();
    } else {
      handleCOD();
    }
  }

  return (
    <div className="checkout">
      <div className="checkout-header">
        <h1 className="checkout-header__title">Checkout</h1>
      </div>

      <form className="checkout-form" onSubmit={handlePlaceOrder}>
        {/* Address */}
        <div className="checkout-section">
          <div className="checkout-section__title">📍 Delivery Address</div>
          <textarea className="checkout-textarea" placeholder="Enter your full delivery address..."
            value={address} onChange={(e) => setAddress(e.target.value)} rows={3} required />
        </div>

        {/* Payment method */}
        <div className="checkout-section">
          <div className="checkout-section__title">💳 Payment Method</div>
          <div className="checkout-payment-options">
            <label className={`checkout-payment-opt${paymentMethod === 'online' ? ' checkout-payment-opt--active' : ''}`}>
              <input type="radio" name="payment" value="online"
                checked={paymentMethod === 'online'}
                onChange={() => setPaymentMethod('online')} />
              <span className="checkout-payment-opt__icon">💳</span>
              <div>
                <div className="checkout-payment-opt__title">Pay Online</div>
                <div className="checkout-payment-opt__sub">UPI, Cards, Netbanking</div>
              </div>
            </label>
            <label className={`checkout-payment-opt${paymentMethod === 'cod' ? ' checkout-payment-opt--active' : ''}`}>
              <input type="radio" name="payment" value="cod"
                checked={paymentMethod === 'cod'}
                onChange={() => setPaymentMethod('cod')} />
              <span className="checkout-payment-opt__icon">💵</span>
              <div>
                <div className="checkout-payment-opt__title">Cash on Delivery</div>
                <div className="checkout-payment-opt__sub">Pay when order arrives</div>
              </div>
            </label>
          </div>
        </div>

        {/* Order items */}
        <div className="checkout-section">
          <div className="checkout-section__title">🛒 Order Summary</div>
          <div className="checkout-items">
            {items.map((item) => (
              <div key={item.cart_item_id} className="checkout-item">
                <span className="checkout-item__name">{item.product_name} {item.variant_name}</span>
                <span className="checkout-item__qty">×{item.quantity}</span>
                <span className="checkout-item__price">₹{(parseFloat(item.price) * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bill */}
        <div className="checkout-section">
          <div className="checkout-section__title">💰 Bill</div>
          <div className="checkout-bill">
            <div className="checkout-bill__row"><span>Subtotal</span><span>₹{parseFloat(subtotal).toFixed(0)}</span></div>
            <div className="checkout-bill__row">
              <span>Delivery</span>
              <span>{deliveryFee === 0 ? <span style={{ color: 'var(--color-accent)' }}>FREE</span> : `₹${deliveryFee}`}</span>
            </div>
            <div className="checkout-bill__row checkout-bill__row--total"><span>Total</span><span>₹{total.toFixed(0)}</span></div>
          </div>
        </div>

        {error && <p className="checkout-error">{error}</p>}

        <button className="checkout-btn" type="submit" disabled={placing}>
          {placing ? 'Processing...' : paymentMethod === 'online'
            ? `Pay ₹${total.toFixed(0)} Online`
            : `Place Order · ₹${total.toFixed(0)}`}
        </button>
      </form>
    </div>
  );
}
