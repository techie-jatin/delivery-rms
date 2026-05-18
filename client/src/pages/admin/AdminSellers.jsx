/**
 * client/src/pages/admin/AdminSellers.jsx
 * Phase 9 — Admin: review and approve/reject seller applications
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import api from '../../services/api/client';
import './Admin.css';

const STATUS_COLORS = {
  pending:  '#fbbf24',
  approved: '#00e5a0',
  rejected: '#ff4d6d',
};

export default function AdminSellers() {
  const navigate = useNavigate();
  const [token,   setToken]   = useState('');
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_token');
    if (!saved) { navigate('/admin'); return; }
    setToken(saved);
    loadSellers(saved);
  }, []);

  async function loadSellers(t) {
    setLoading(true);
    try {
      const data = await api.get('/sellers', t);
      setSellers(data.sellers || []);
    } catch {} finally { setLoading(false); }
  }

  async function handleApprove(id) {
    setActing(id);
    try {
      await api.put(`/sellers/${id}/approve`, {}, token);
      setSellers((prev) => prev.map((s) => s.id === id ? { ...s, status: 'approved', is_active: true } : s));
    } catch (err) { alert(err.message); }
    finally { setActing(null); }
  }

  async function handleReject(id) {
    const reason = prompt('Rejection reason (optional):') || 'Application did not meet requirements.';
    setActing(id);
    try {
      await api.put(`/sellers/${id}/reject`, { reason }, token);
      setSellers((prev) => prev.map((s) => s.id === id ? { ...s, status: 'rejected', is_active: false } : s));
    } catch (err) { alert(err.message); }
    finally { setActing(null); }
  }

  return (
    <AdminLayout>
      <div className="adm-page">
        <div className="adm-page__header">
          <h1 className="adm-page__title">Sellers</h1>
          <button className="adm-btn adm-btn--ghost" onClick={() => loadSellers(token)}>↻ Refresh</button>
        </div>

        {/* Stats */}
        <div className="adm-stats">
          <div className="adm-stat">
            <div className="adm-stat__value">{sellers.filter((s) => s.status === 'pending').length}</div>
            <div className="adm-stat__label">Pending</div>
          </div>
          <div className="adm-stat">
            <div className="adm-stat__value">{sellers.filter((s) => s.status === 'approved').length}</div>
            <div className="adm-stat__label">Approved</div>
          </div>
          <div className="adm-stat">
            <div className="adm-stat__value">{sellers.filter((s) => s.status === 'rejected').length}</div>
            <div className="adm-stat__label">Rejected</div>
          </div>
          <div className="adm-stat">
            <div className="adm-stat__value">{sellers.length}</div>
            <div className="adm-stat__label">Total</div>
          </div>
        </div>

        {loading ? (
          <p className="adm-muted">Loading sellers...</p>
        ) : sellers.length === 0 ? (
          <p className="adm-muted">No seller applications yet.</p>
        ) : (
          <div className="adm-order-list">
            {sellers.map((seller) => (
              <div key={seller.id} className="adm-order-card">
                <div className="adm-order-card__top">
                  <div>
                    <span className="adm-order-card__id">{seller.shop_name}</span>
                    <span className="adm-order-card__date">
                      by {seller.owner_name} · {seller.owner_email}
                    </span>
                  </div>
                  <span className={`adm-badge`} style={{
                    background: STATUS_COLORS[seller.status] + '22',
                    color: STATUS_COLORS[seller.status],
                  }}>
                    {seller.status}
                  </span>
                </div>

                <div className="adm-order-card__address">
                  📍 {seller.address} · 📞 {seller.phone}
                  {seller.gstin && ` · GST: ${seller.gstin}`}
                </div>

                {seller.shop_description && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-muted)', marginTop: '4px' }}>
                    {seller.shop_description}
                  </div>
                )}

                <div className="adm-order-card__bottom">
                  {seller.status === 'pending' && (
                    <>
                      <button
                        className="adm-btn adm-btn--primary"
                        onClick={() => handleApprove(seller.id)}
                        disabled={acting === seller.id}
                      >
                        ✓ Approve
                      </button>
                      <button
                        className="adm-btn adm-btn--danger"
                        onClick={() => handleReject(seller.id)}
                        disabled={acting === seller.id}
                      >
                        ✕ Reject
                      </button>
                    </>
                  )}
                  {seller.status === 'approved' && (
                    <span className="adm-muted" style={{ fontSize: '0.7rem' }}>
                      ✓ Active seller
                    </span>
                  )}
                  {seller.status === 'rejected' && (
                    <button
                      className="adm-btn adm-btn--ghost"
                      onClick={() => handleApprove(seller.id)}
                      disabled={acting === seller.id}
                    >
                      Re-approve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
