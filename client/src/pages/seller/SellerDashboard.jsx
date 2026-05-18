/**
 * client/src/pages/seller/SellerDashboard.jsx
 * Phase 9 — Seller panel: view shop status, manage products
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import api from '../../services/api/client';
import './Seller.css';

const EMPTY_VARIANT = { name: '', sku: '', price: '', mrp: '', stock: '', max_qty_per_order: '10', unit: '' };
const EMPTY_PRODUCT = { name: '', slug: '', brand: '', description: '', category_id: '', variants: [{ ...EMPTY_VARIANT }] };

export default function SellerDashboard() {
  const { user, token } = useAuth();
  const navigate        = useNavigate();

  const [seller,   setSeller]   = useState(null);
  const [products, setProducts] = useState([]);
  const [cats,     setCats]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState(EMPTY_PRODUCT);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    loadData();
  }, [token]);

  async function loadData() {
    setLoading(true);
    try {
      const sellerData = await api.get('/sellers/me', token);
      setSeller(sellerData.seller);

      if (sellerData.seller.status === 'approved') {
        const [prodData, catData] = await Promise.all([
          api.get(`/sellers/${sellerData.seller.id}/products`),
          api.get('/products'),
        ]);
        setProducts(prodData.products || []);
        // Extract categories
        const seen = new Set();
        const cats = [];
        for (const p of catData.products || []) {
          if (!seen.has(p.category_id)) {
            seen.add(p.category_id);
            cats.push({ id: p.category_id, name: p.category_name });
          }
        }
        setCats(cats);
      }
    } catch {
      // No seller profile yet
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="seller-empty">
        <p>Please <Link to="/login" className="seller-link">login</Link> to access seller dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="seller-empty"><span className="seller-spinner" /></div>;
  }

  // No seller profile — prompt to register
  if (!seller) {
    return (
      <div className="seller-empty">
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🏪</div>
        <h2 style={{ color: 'var(--color-text)', marginBottom: '8px' }}>Sell on Haat</h2>
        <p style={{ color: 'var(--color-muted)', marginBottom: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          Register your shop and start selling to Kota customers
        </p>
        <Link to="/seller/register" className="seller-btn">Register as Seller</Link>
      </div>
    );
  }

  // Pending approval
  if (seller.status === 'pending') {
    return (
      <div className="seller-empty">
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⏳</div>
        <h2 style={{ color: 'var(--color-text)', marginBottom: '8px' }}>{seller.shop_name}</h2>
        <p style={{ color: '#fbbf24', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          Application under review
        </p>
        <p style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', marginTop: '8px' }}>
          Admin will approve your shop within 24 hours
        </p>
      </div>
    );
  }

  // Rejected
  if (seller.status === 'rejected') {
    return (
      <div className="seller-empty">
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✕</div>
        <h2 style={{ color: 'var(--color-danger)', marginBottom: '8px' }}>Application Rejected</h2>
        <p style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          {seller.rejection_reason}
        </p>
        <p style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', marginTop: '8px' }}>
          Contact support to reapply
        </p>
      </div>
    );
  }

  // ── Approved seller dashboard ─────────────────────────────────
  async function handleAddProduct(e) {
    e.preventDefault();
    if (!form.name || !form.category_id) { setError('Name and category are required.'); return; }
    if (!form.variants[0].sku || !form.variants[0].price) { setError('Variant SKU and price required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        slug:        form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        category_id: parseInt(form.category_id),
        seller_id:   seller.id,
        variants:    form.variants.map((v) => ({
          ...v, price: parseFloat(v.price), mrp: v.mrp ? parseFloat(v.mrp) : null,
          stock: parseInt(v.stock) || 0, max_qty_per_order: parseInt(v.max_qty_per_order) || 10,
        })),
      };
      await api.post('/products', payload, token);
      setModal(false);
      setForm(EMPTY_PRODUCT);
      loadData();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="seller-page">
      <div className="seller-header">
        <div>
          <h1 className="seller-header__title">🏪 {seller.shop_name}</h1>
          <p className="seller-header__sub">{seller.address}</p>
        </div>
        <span className="seller-approved-badge">✓ Approved</span>
      </div>

      <div className="seller-stats">
        <div className="seller-stat">
          <div className="seller-stat__value">{products.length}</div>
          <div className="seller-stat__label">Products</div>
        </div>
        <div className="seller-stat">
          <div className="seller-stat__value">
            {products.reduce((s, p) => s + (p.variants?.[0]?.stock || 0), 0)}
          </div>
          <div className="seller-stat__label">Total Stock</div>
        </div>
      </div>

      <div className="seller-section">
        <div className="seller-section__header">
          <span className="seller-section__title">My Products</span>
          <button className="seller-btn seller-btn--sm" onClick={() => setModal(true)}>+ Add Product</button>
        </div>

        {products.length === 0 ? (
          <p className="seller-muted">No products yet. Add your first product.</p>
        ) : (
          <div className="seller-product-list">
            {products.map((p) => (
              <div key={p.id} className="seller-product-card">
                <div className="seller-product-card__name">{p.name}</div>
                <div className="seller-product-card__meta">{p.brand} · {p.category_name}</div>
                <div className="seller-product-card__variants">
                  {p.variants.map((v) => (
                    <span key={v.id} className="seller-variant-tag">
                      {v.name} · ₹{parseFloat(v.price).toFixed(0)} · stock:{v.stock}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {modal && (
        <div className="seller-modal-overlay" onClick={() => setModal(false)}>
          <div className="seller-modal" onClick={(e) => e.stopPropagation()}>
            <div className="seller-modal__header">
              <h2>Add Product</h2>
              <button onClick={() => setModal(false)}>✕</button>
            </div>
            <form className="seller-modal__body" onSubmit={handleAddProduct}>
              <div className="seller-field">
                <label className="seller-label">Product Name *</label>
                <input className="seller-input" value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})} placeholder="e.g. Fresh Milk" />
              </div>
              <div className="seller-field">
                <label className="seller-label">Brand</label>
                <input className="seller-input" value={form.brand}
                  onChange={(e) => setForm({...form, brand: e.target.value})} />
              </div>
              <div className="seller-field">
                <label className="seller-label">Category *</label>
                <select className="seller-input" value={form.category_id}
                  onChange={(e) => setForm({...form, category_id: e.target.value})}>
                  <option value="">Select...</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="seller-field">
                <label className="seller-label">Description</label>
                <textarea className="seller-input" rows={2} value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})} />
              </div>
              <p className="seller-label" style={{ marginTop: '8px' }}>Variant</p>
              {['name','sku','price','mrp','stock','max_qty_per_order','unit'].map((field) => (
                <div key={field} className="seller-field">
                  <label className="seller-label">{field.replace(/_/g,' ')}</label>
                  <input className="seller-input"
                    value={form.variants[0][field]}
                    onChange={(e) => {
                      const v = [...form.variants];
                      v[0] = { ...v[0], [field]: e.target.value };
                      setForm({...form, variants: v});
                    }}
                    type={['price','mrp','stock','max_qty_per_order'].includes(field) ? 'number' : 'text'}
                  />
                </div>
              ))}
              {error && <p className="seller-error">{error}</p>}
              <div className="seller-modal__footer">
                <button type="button" className="seller-btn seller-btn--ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="seller-btn" disabled={saving}>
                  {saving ? 'Adding...' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
