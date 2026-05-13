/**
 * client/src/pages/ProductDetail.jsx
 * Phase 3.3 — Product detail page
 * Shows all variants, lets user pick one and add to cart.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useCart } from '../hooks/useCart.jsx';
import { fetchProduct } from '../services/api/products';
import './ProductDetail.css';

export default function ProductDetail() {
  const { slug }    = useParams();
  const navigate    = useNavigate();
  const { token }   = useAuth();
  const { items, addItem, updateItem } = useCart();

  const [product,  setProduct]  = useState(null);
  const [selected, setSelected] = useState(0); // variant index
  const [loading,  setLoading]  = useState(true);
  const [adding,   setAdding]   = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    // Find product by slug — fetch all and match
    import('../services/api/products').then(({ fetchProducts }) =>
      fetchProducts()
    ).then((products) => {
      const found = products.find((p) => p.slug === slug);
      if (found) setProduct(found);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="pd-loading">
        <span className="pd-spinner" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pd-empty">
        <p>Product not found.</p>
        <button onClick={() => navigate('/')}>← Back to home</button>
      </div>
    );
  }

  const variant    = product.variants[selected];
  const cartItem   = items.find((i) => i.variant_id === variant?.id);
  const cartQty    = cartItem ? cartItem.quantity : 0;
  const isMaxQty   = cartQty >= (variant?.max_qty_per_order || 10);
  const isOutOfStock = !variant || variant.stock === 0;
  const discount   = variant?.mrp && variant.mrp > variant.price
    ? Math.round((1 - variant.price / variant.mrp) * 100) : null;

  async function handleAdd() {
    if (!token) { navigate('/login'); return; }
    setAdding(true);
    const result = await addItem(variant.id, 1, token);
    if (!result.success) {
      setFeedback(result.error);
      setTimeout(() => setFeedback(''), 2500);
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
      setTimeout(() => setFeedback(''), 2500);
      return;
    }
    await handleAdd();
  }

  return (
    <div className="pd">
      {/* Back */}
      <button className="pd-back" onClick={() => navigate(-1)}>← Back</button>

      {/* Image */}
      <div className="pd-image">
        {variant?.image_url
          ? <img src={variant.image_url} alt={product.name} />
          : <div className="pd-image__placeholder">🛒</div>
        }
        {discount && <span className="pd-discount">{discount}% off</span>}
      </div>

      {/* Info */}
      <div className="pd-info">
        <div className="pd-brand">{product.brand}</div>
        <h1 className="pd-name">{product.name}</h1>
        {product.description && <p className="pd-desc">{product.description}</p>}

        {/* Variant selector */}
        {product.variants.length > 1 && (
          <div className="pd-variants">
            <div className="pd-variants__label">Select size</div>
            <div className="pd-variants__options">
              {product.variants.map((v, i) => (
                <button
                  key={v.id}
                  className={`pd-variant-btn${selected === i ? ' pd-variant-btn--active' : ''}`}
                  onClick={() => setSelected(i)}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Price */}
        <div className="pd-price-row">
          <span className="pd-price">₹{parseFloat(variant?.price || 0).toFixed(0)}</span>
          {variant?.mrp && variant.mrp > variant.price && (
            <span className="pd-mrp">₹{parseFloat(variant.mrp).toFixed(0)}</span>
          )}
        </div>

        {/* Stock */}
        {variant?.stock > 0 && variant.stock <= 5 && (
          <p className="pd-low-stock">Only {variant.stock} left!</p>
        )}

        {/* Feedback */}
        {feedback && <p className="pd-feedback">{feedback}</p>}

        {/* Cart controls */}
        {isOutOfStock ? (
          <div className="pd-out-of-stock">Out of stock</div>
        ) : cartQty === 0 ? (
          <button className="pd-add-btn" onClick={handleAdd} disabled={adding}>
            {adding ? 'Adding...' : '+ Add to Cart'}
          </button>
        ) : (
          <div className="pd-qty-controls">
            <button className="pd-qty-btn" onClick={handleDecrease}>−</button>
            <span className="pd-qty">{cartQty}</span>
            <button className="pd-qty-btn" onClick={handleIncrease} disabled={isMaxQty}>+</button>
          </div>
        )}
      </div>
    </div>
  );
}
