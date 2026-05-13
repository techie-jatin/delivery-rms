/**
 * client/src/pages/admin/AdminBanners.jsx
 * Phase 5.4 — Festival banner management
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import api from '../../services/api/client';
import './Admin.css';
import './AdminBanners.css';

const EMPTY = {
  title: '', subtitle: '', emoji: '',
  cta_label: '', cta_link: '',
  bg_color: '#00e5a0', text_color: '#0a0a0f',
  starts_at: '', ends_at: '',
};

function toLocalInput(iso) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 16);
}

export default function AdminBanners() {
  const navigate = useNavigate();
  const [token,   setToken]   = useState('');
  const [banners, setBanners] = useState([]);
  const [form,    setForm]    = useState(EMPTY);
  const [editId,  setEditId]  = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_token');
    if (!saved) { navigate('/admin'); return; }
    setToken(saved);
    loadBanners(saved);
  }, []);

  async function loadBanners(t) {
    try {
      const data = await api.get('/banners/all', t);
      setBanners(data.banners || []);
    } catch {}
  }

  function openEdit(b) {
    setForm({
      title:      b.title,
      subtitle:   b.subtitle || '',
      emoji:      b.emoji || '',
      cta_label:  b.cta_label || '',
      cta_link:   b.cta_link || '',
      bg_color:   b.bg_color || '#00e5a0',
      text_color: b.text_color || '#0a0a0f',
      starts_at:  toLocalInput(b.starts_at),
      ends_at:    toLocalInput(b.ends_at),
    });
    setEditId(b.id);
    setError('');
  }

  function resetForm() {
    setForm(EMPTY);
    setEditId(null);
    setError('');
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.title || !form.starts_at || !form.ends_at) {
      setError('Title, start date and end date are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at:   new Date(form.ends_at).toISOString(),
      };
      if (editId) {
        await api.put(`/banners/${editId}`, payload, token);
      } else {
        await api.post('/banners', payload, token);
      }
      resetForm();
      loadBanners(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this banner?')) return;
    await api.delete(`/banners/${id}`, token);
    loadBanners(token);
  }

  function isLive(b) {
    const now = Date.now();
    return new Date(b.starts_at) <= now && new Date(b.ends_at) >= now && b.is_active;
  }

  return (
    <AdminLayout>
      <div className="adm-page">
        <div class="adm-page__header">
          <h1 className="adm-page__title">Festival Banners</h1>
        </div>

        {/* ── Form ── */}
        <div className="adm-section">
          <div className="adm-section__title">{editId ? 'Edit Banner' : 'Create Banner'}</div>
          <form className="admb-form" onSubmit={handleSave}>
            <div className="admb-grid">
              <div className="admp-field">
                <label className="admp-label">Title *</label>
                <input className="adm-input" value={form.title}
                  onChange={(e) => setForm({...form, title: e.target.value})}
                  placeholder="e.g. Happy Diwali! 🪔" />
              </div>
              <div className="admp-field">
                <label className="admp-label">Subtitle</label>
                <input className="adm-input" value={form.subtitle}
                  onChange={(e) => setForm({...form, subtitle: e.target.value})}
                  placeholder="e.g. Special offers on sweets & gifts" />
              </div>
              <div className="admp-field">
                <label className="admp-label">Emoji</label>
                <input className="adm-input" value={form.emoji}
                  onChange={(e) => setForm({...form, emoji: e.target.value})}
                  placeholder="🪔" style={{ fontSize: '1.2rem' }} />
              </div>
              <div className="admp-field">
                <label className="admp-label">CTA Button Text</label>
                <input className="adm-input" value={form.cta_label}
                  onChange={(e) => setForm({...form, cta_label: e.target.value})}
                  placeholder="Shop Now" />
              </div>
              <div className="admp-field">
                <label className="admp-label">CTA Link</label>
                <input className="adm-input" value={form.cta_link}
                  onChange={(e) => setForm({...form, cta_link: e.target.value})}
                  placeholder="/category/health-drinks" />
              </div>
              <div className="admp-field">
                <label className="admp-label">Background Color</label>
                <div className="admb-color-row">
                  <input type="color" value={form.bg_color}
                    onChange={(e) => setForm({...form, bg_color: e.target.value})} />
                  <span className="adm-muted">{form.bg_color}</span>
                </div>
              </div>
              <div className="admp-field">
                <label className="admp-label">Text Color</label>
                <div className="admb-color-row">
                  <input type="color" value={form.text_color}
                    onChange={(e) => setForm({...form, text_color: e.target.value})} />
                  <span className="adm-muted">{form.text_color}</span>
                </div>
              </div>
              <div className="admp-field">
                <label className="admp-label">Starts At *</label>
                <input className="adm-input" type="datetime-local" value={form.starts_at}
                  onChange={(e) => setForm({...form, starts_at: e.target.value})} />
              </div>
              <div className="admp-field">
                <label className="admp-label">Ends At *</label>
                <input className="adm-input" type="datetime-local" value={form.ends_at}
                  onChange={(e) => setForm({...form, ends_at: e.target.value})} />
              </div>
            </div>

            {/* Preview */}
            {form.title && (
              <div className="admb-preview" style={{ background: form.bg_color, color: form.text_color }}>
                <span style={{ fontSize: '1.5rem' }}>{form.emoji}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{form.title}</div>
                  {form.subtitle && <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: 2 }}>{form.subtitle}</div>}
                </div>
                {form.cta_label && (
                  <span style={{ padding: '6px 12px', borderRadius: '6px', background: form.text_color, color: form.bg_color, fontSize: '0.7rem', fontWeight: 700 }}>
                    {form.cta_label}
                  </span>
                )}
              </div>
            )}

            {error && <p className="adm-error">{error}</p>}

            <div className="admb-form-actions">
              {editId && (
                <button type="button" className="adm-btn adm-btn--ghost" onClick={resetForm}>
                  Cancel
                </button>
              )}
              <button className="adm-btn adm-btn--primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : editId ? 'Save Changes' : 'Create Banner'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Banner list ── */}
        <div className="adm-section">
          <div className="adm-section__title">All Banners</div>
          {banners.length === 0 ? (
            <p className="adm-muted">No banners yet.</p>
          ) : (
            <div className="admb-list">
              {banners.map((b) => (
                <div key={b.id} className="admb-card">
                  <div className="admb-card__preview"
                    style={{ background: b.bg_color, color: b.text_color }}>
                    <span>{b.emoji}</span>
                    <strong>{b.title}</strong>
                    {isLive(b) && <span className="admb-live">LIVE</span>}
                  </div>
                  <div className="admb-card__meta">
                    <span className="adm-muted">
                      {new Date(b.starts_at).toLocaleDateString('en-IN')} →{' '}
                      {new Date(b.ends_at).toLocaleDateString('en-IN')}
                    </span>
                    <div className="admb-card__actions">
                      <button className="adm-btn adm-btn--ghost" onClick={() => openEdit(b)}>Edit</button>
                      <button className="adm-btn adm-btn--danger" onClick={() => handleDelete(b.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
