/**
 * client/src/pages/admin/AdminProducts.jsx
 * Phase 4.2 — Admin product management
 *
 * Lists all products, allows add / edit / deactivate.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import api from '../../services/api/client';
import './Admin.css';
import './AdminProducts.css';

const EMPTY_VARIANT = {
  name: '', sku: '', price: '', mrp: '',
  stock: '', max_qty_per_order: '10', unit: '',
};

const EMPTY_PRODUCT = {
  name: '', slug: '', brand: '', description: '',
  category_id: '', variants: [{ ...EMPTY_VARIANT }],
};

export default function AdminProducts() {
  const navigate = useNavigate();
  const [token,    setToken]    = useState('');
  const [products, setProducts] = useState([]);
  const [cats,     setCats]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);  // 'add' | 'edit'
  const [form,     setForm]     = useState(EMPTY_PRODUCT);
  const [editId,   setEditId]   = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_token');
    if (!saved) { navigate('/admin'); return; }
    setToken(saved);
    loadData(saved);
  }, []);

  async function loadData(t) {
    setLoading(true);
    try {
      const data = await api.get('/products', t);
      setProducts(data.products || []);
      // Extract unique categories
      const seen = new Set();
      const categories = [];
      for (const p of data.products || []) {
        if (!seen.has(p.category_id)) {
          seen.add(p.category_id);
          categories.push({ id: p.category_id, name: p.category_name });
        }
      }
      setCats(categories);
    } catch {}
    finally { setLoading(false); }
  }

  // ── Auto-generate slug from name ──────────────────────────────
  function nameToSlug(name) {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  // ── Form field helpers ────────────────────────────────────────
  function setField(field, value) {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'name' && !editId) {
        updated.slug = nameToSlug(value);
      }
      return updated;
    });
  }

  function setVariantField(index, field, value) {
    setForm((prev) => {
      const variants = [...prev.variants];
      variants[index] = { ...variants[index], [field]: value };
      // Auto-generate SKU from product name + variant name
      if (field === 'name' && !variants[index].sku) {
        const prefix = (form.name || '').slice(0, 3).toUpperCase();
        variants[index].sku = `${prefix}-${value.toUpperCase().replace(/\s+/g, '')}`;
      }
      return { ...prev, variants };
    });
  }

  function addVariant() {
    setForm((prev) => ({
      ...prev,
      variants: [...prev.variants, { ...EMPTY_VARIANT }],
    }));
  }

  function removeVariant(index) {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  }

  // ── Open add modal ────────────────────────────────────────────
  function openAdd() {
    setForm(EMPTY_PRODUCT);
    setEditId(null);
    setError('');
    setModal('add');
  }

  // ── Open edit modal ───────────────────────────────────────────
  function openEdit(product) {
    setForm({
      name:        product.name,
      slug:        product.slug,
      brand:       product.brand || '',
      description: product.description || '',
      category_id: String(product.category_id),
      variants:    product.variants.map((v) => ({
        id:                v.id,
        name:              v.name,
        sku:               v.sku,
        price:             String(v.price),
        mrp:               String(v.mrp || ''),
        stock:             String(v.stock),
        max_qty_per_order: String(v.max_qty_per_order),
        unit:              v.unit || '',
      })),
    });
    setEditId(product.id);
    setError('');
    setModal('edit');
  }

  // ── Save (add or edit) ────────────────────────────────────────
  async function handleSave() {
    setError('');
    if (!form.name || !form.slug || !form.category_id) {
      setError('Name, slug and category are required.');
      return;
    }
    for (const v of form.variants) {
      if (!v.name || !v.sku || !v.price) {
        setError('Each variant needs name, SKU and price.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name:        form.name,
        slug:        form.slug,
        brand:       form.brand,
        description: form.description,
        category_id: parseInt(form.category_id),
        variants:    form.variants.map((v) => ({
          name:              v.name,
          sku:               v.sku,
          price:             parseFloat(v.price),
          mrp:               v.mrp ? parseFloat(v.mrp) : null,
          stock:             parseInt(v.stock) || 0,
          max_qty_per_order: parseInt(v.max_qty_per_order) || 10,
          unit:              v.unit,
        })),
      };

      if (modal === 'add') {
        await api.post('/products', payload, token);
      } else {
        await api.put(`/products/${editId}`, payload, token);
      }

      setModal(null);
      loadData(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Deactivate ────────────────────────────────────────────────
  async function handleDeactivate(id) {
    if (!confirm('Deactivate this product? It will hide from customers.')) return;
    try {
      await api.delete(`/products/${id}`, token);
      loadData(token);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <AdminLayout>
      <div className="adm-page">
        <div className="adm-page__header">
          <h1 className="adm-page__title">Products</h1>
          <button className="adm-btn adm-btn--primary" onClick={openAdd}>
            + Add Product
          </button>
        </div>

        {loading ? (
          <p className="adm-muted">Loading...</p>
        ) : (
          <div className="admp-list">
            {products.map((product) => (
              <div key={product.id} className="admp-card">
                <div className="admp-card__info">
                  <div className="admp-card__name">{product.name}</div>
                  <div className="admp-card__brand">{product.brand} · {product.category_name}</div>
                  <div className="admp-card__variants">
                    {product.variants.map((v) => (
                      <span key={v.id} className="admp-variant-tag">
                        {v.name} · ₹{parseFloat(v.price).toFixed(0)} · stock:{v.stock} · max:{v.max_qty_per_order}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="admp-card__actions">
                  <button className="adm-btn adm-btn--ghost" onClick={() => openEdit(product)}>
                    Edit
                  </button>
                  <button
                    className="adm-btn adm-btn--danger"
                    onClick={() => handleDeactivate(product.id)}
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div className="admp-modal-overlay" onClick={() => setModal(null)}>
          <div className="admp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admp-modal__header">
              <h2>{modal === 'add' ? 'Add Product' : 'Edit Product'}</h2>
              <button className="admp-modal__close" onClick={() => setModal(null)}>✕</button>
            </div>

            <div className="admp-modal__body">
              {/* Product fields */}
              <div className="admp-form-grid">
                <div className="admp-field">
                  <label className="admp-label">Product Name *</label>
                  <input className="adm-input" value={form.name}
                    onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Horlicks" />
                </div>
                <div className="admp-field">
                  <label className="admp-label">Slug *</label>
                  <input className="adm-input" value={form.slug}
                    onChange={(e) => setField('slug', e.target.value)} placeholder="e.g. horlicks" />
                </div>
                <div className="admp-field">
                  <label className="admp-label">Brand</label>
                  <input className="adm-input" value={form.brand}
                    onChange={(e) => setField('brand', e.target.value)} placeholder="e.g. GSK" />
                </div>
                <div className="admp-field">
                  <label className="admp-label">Category *</label>
                  <select className="adm-select adm-select--full" value={form.category_id}
                    onChange={(e) => setField('category_id', e.target.value)}>
                    <option value="">Select category</option>
                    {cats.map((c) => (
                      <option key={c.id} value={String(c.id)}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="admp-field" style={{ marginTop: '12px' }}>
                <label className="admp-label">Description</label>
                <textarea className="adm-input" rows={2} value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  style={{ resize: 'none' }} />
              </div>

              {/* Variants */}
              <div className="admp-variants-header">
                <span className="admp-label">Variants *</span>
                <button className="adm-btn adm-btn--ghost" onClick={addVariant}>+ Add Variant</button>
              </div>

              {form.variants.map((v, i) => (
                <div key={i} className="admp-variant-block">
                  <div className="admp-variant-block__header">
                    <span className="admp-label">Variant {i + 1}</span>
                    {form.variants.length > 1 && (
                      <button className="admp-remove-btn" onClick={() => removeVariant(i)}>✕ Remove</button>
                    )}
                  </div>
                  <div className="admp-form-grid admp-form-grid--3">
                    <div className="admp-field">
                      <label className="admp-label">Name *</label>
                      <input className="adm-input" value={v.name}
                        onChange={(e) => setVariantField(i, 'name', e.target.value)}
                        placeholder="e.g. 500g" />
                    </div>
                    <div className="admp-field">
                      <label className="admp-label">SKU *</label>
                      <input className="adm-input" value={v.sku}
                        onChange={(e) => setVariantField(i, 'sku', e.target.value)}
                        placeholder="e.g. HOR-500G" />
                    </div>
                    <div className="admp-field">
                      <label className="admp-label">Unit</label>
                      <input className="adm-input" value={v.unit}
                        onChange={(e) => setVariantField(i, 'unit', e.target.value)}
                        placeholder="g / ml / pcs" />
                    </div>
                    <div className="admp-field">
                      <label className="admp-label">Price (₹) *</label>
                      <input className="adm-input" type="number" value={v.price}
                        onChange={(e) => setVariantField(i, 'price', e.target.value)} />
                    </div>
                    <div className="admp-field">
                      <label className="admp-label">MRP (₹)</label>
                      <input className="adm-input" type="number" value={v.mrp}
                        onChange={(e) => setVariantField(i, 'mrp', e.target.value)} />
                    </div>
                    <div className="admp-field">
                      <label className="admp-label">Stock</label>
                      <input className="adm-input" type="number" value={v.stock}
                        onChange={(e) => setVariantField(i, 'stock', e.target.value)} />
                    </div>
                    <div className="admp-field">
                      <label className="admp-label">Max Qty/Order</label>
                      <input className="adm-input" type="number" value={v.max_qty_per_order}
                        onChange={(e) => setVariantField(i, 'max_qty_per_order', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}

              {error && <p className="adm-error" style={{ marginTop: '12px' }}>{error}</p>}
            </div>

            <div className="admp-modal__footer">
              <button className="adm-btn adm-btn--ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="adm-btn adm-btn--primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : modal === 'add' ? 'Add Product' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
