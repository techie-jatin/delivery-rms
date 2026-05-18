/**
 * client/src/pages/seller/SellerRegister.jsx
 * Phase 9 — Seller registration / shop application
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import api from '../../services/api/client';
import './Seller.css';

export default function SellerRegister() {
  const navigate       = useNavigate();
  const { user, token } = useAuth();

  const [form, setForm] = useState({
    shop_name: '', shop_description: '', address: '', phone: '', gstin: '',
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  if (!user) {
    return (
      <div className="seller-empty">
        <p>Please <Link to="/login" className="seller-link">login</Link> first to register as a seller.</p>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.shop_name || !form.address || !form.phone) {
      setError('Shop name, address and phone are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/sellers/register', form, token);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div className="seller-success">
        <div className="seller-success__icon">✓</div>
        <h1>Application Submitted!</h1>
        <p>Your shop application is under review. Admin will approve it within 24 hours.</p>
        <p>You'll be able to list products once approved.</p>
        <Link to="/seller" className="seller-btn">Go to Seller Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="seller-page">
      <div className="seller-header">
        <h1 className="seller-header__title">Register as Seller</h1>
        <p className="seller-header__sub">Sell your products on Haat and reach customers in Kota</p>
      </div>

      <form className="seller-form" onSubmit={handleSubmit}>
        <div className="seller-field">
          <label className="seller-label">Shop Name *</label>
          <input className="seller-input" value={form.shop_name}
            onChange={(e) => setForm({...form, shop_name: e.target.value})}
            placeholder="e.g. Sharma General Store" />
        </div>

        <div className="seller-field">
          <label className="seller-label">Shop Description</label>
          <textarea className="seller-input" rows={3} value={form.shop_description}
            onChange={(e) => setForm({...form, shop_description: e.target.value})}
            placeholder="What do you sell? Tell customers about your shop..." />
        </div>

        <div className="seller-field">
          <label className="seller-label">Address *</label>
          <input className="seller-input" value={form.address}
            onChange={(e) => setForm({...form, address: e.target.value})}
            placeholder="Full shop address in Kota" />
        </div>

        <div className="seller-field">
          <label className="seller-label">Phone *</label>
          <input className="seller-input" type="tel" value={form.phone}
            onChange={(e) => setForm({...form, phone: e.target.value})}
            placeholder="10-digit mobile number" />
        </div>

        <div className="seller-field">
          <label className="seller-label">GSTIN (optional)</label>
          <input className="seller-input" value={form.gstin}
            onChange={(e) => setForm({...form, gstin: e.target.value})}
            placeholder="GST number if registered" />
        </div>

        {error && <p className="seller-error">{error}</p>}

        <button className="seller-btn" type="submit" disabled={saving}>
          {saving ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
    </div>
  );
}
