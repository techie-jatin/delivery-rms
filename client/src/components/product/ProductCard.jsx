/**
 * client/src/components/product/ProductCard.jsx
 * Single product card shown in the product grid.
 * Shows name, price, discount, stock status, add/remove qty controls.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useCart } from '../../hooks/useCart.jsx';
import './ProductCard.css';

export default function ProductCard({ product, variant: variantProp }) {
  const { token } = useAuth();
  const { items, addItem, updateItem } = useCart();

  // Use passed variant prop, or fall back to first variant
  const variant = variantProp || product.variants?.[0];
  if (!variant) return null;

  // Check if this variant is already in cart
  const cartItem = items.find((i) => i.variant_id === variant.id);
  const cartQty  = cartItem ? cartItem.quantity : 0;

  const [adding, setAdding]   = useState(false);
  const [feedback, setFeedback] = useState('');

  const isMaxQty    = cartQty >= variant.max_qty_per_order;
  const isOutOfStock = variant.stock === 0;

  // Discount percentage
  const discount = variant.mrp && variant.mrp > variant.price
    ? Math.round((1 - variant.price / variant.mrp) * 100)
    : null;

  // Low stock warning
  const isLowStock = variant.stock > 0 && variant.stock <= 5;

  async function handleAdd() {
    if (!token) {
      setFeedback('Login to add items');
      setTimeout(() => setFeedback(''), 2000);
      return;
    }
    setAdding(true);
    const result = await addItem(variant.id, 1, token);
    if (!result.success) {
      setFeedback(result.error);
      setTimeout(() => setFeedback(''), 2000);
    }
    setAdding(false);
  }

  async function handleDecrease() {
    if (!cartItem) return;
    await updateItem(cartItem.cart_item_id, cartQty - 1, token);
  }

  async function handleIncrease() {
    if (isMaxQty) {
      setFeedback(`Max ${variant.max_qty_per_order} per order`);
      setTimeout(() => setFeedback(''), 2000);
      return;
    }
    await handleAdd();
  }

  return (
    <div className="pcard">
      {/* Image — click to open product detail */}
      <Link to={`/product/${product.slug}`} className="pcard__img-wrap">
        {variant.image_url
          ? <img src={variant.image_url} alt={product.name} className="pcard__img" />
          : <div className="pcard__img-placeholder">🛒</div>
        }
        {discount && <span className="pcard__discount">{discount}% off</span>}
        {isLowStock && <span className="pcard__low-stock">Only {variant.stock} left</span>}
      </Link>

      {/* Info */}
      <div className="pcard__body">
        <div className="pcard__brand">{product.brand}</div>
        <Link to={`/product/${product.slug}`} className="pcard__name pcard__name--link">{product.name}</Link>
        <div className="pcard__unit">{variant.name} {variant.unit}</div>

        <div className="pcard__price-row">
          <span className="pcard__price">₹{parseFloat(variant.price).toFixed(0)}</span>
          {variant.mrp && variant.mrp > variant.price && (
            <span className="pcard__mrp">₹{parseFloat(variant.mrp).toFixed(0)}</span>
          )}
        </div>

        {/* Feedback message */}
        {feedback && <div className="pcard__feedback">{feedback}</div>}

        {/* Add / Qty controls */}
        {isOutOfStock ? (
          <div className="pcard__out-of-stock">Out of stock</div>
        ) : cartQty === 0 ? (
          <button
            className="pcard__add-btn"
            onClick={handleAdd}
            disabled={adding}
          >
            {adding ? '...' : '+ Add'}
          </button>
        ) : (
          <div className="pcard__qty-controls">
            <button className="pcard__qty-btn" onClick={handleDecrease}>−</button>
            <span className="pcard__qty">{cartQty}</span>
            <button
              className="pcard__qty-btn"
              onClick={handleIncrease}
              disabled={isMaxQty}
            >+</button>
          </div>
        )}
      </div>
    </div>
  );
}
