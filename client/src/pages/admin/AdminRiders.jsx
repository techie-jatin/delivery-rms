/**
 * client/src/pages/admin/AdminRiders.jsx
 * Phase 10 — Admin: manage riders + assign to orders
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import api from '../../services/api/client';
import './Admin.css';

export default function AdminRiders() {
  const navigate = useNavigate();
  const [token,  setToken]  = useState('');
  const [riders, setRiders] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading,setLoading]= useState(true);

  // Add rider form
  const [name,  setName]  = useState('');
  const [phone, setPhone] = useState('');
  const [adding,setAdding]= useState(false);

  // Assign rider
  const [assigning, setAssigning] = useState(null); // order id being assigned
  const [assignOtp, setAssignOtp] = useState({});   // { orderId: otp }

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_token');
    if (!saved) { navigate('/admin'); return; }
    setToken(saved);
    loadData(saved);
  }, []);

  async function loadData(t) {
    setLoading(true);
    try {
      const [riderData, orderData] = await Promise.all([
        api.get('/riders', t),
        api.get('/orders', t),
      ]);
      setRiders(riderData.riders || []);
      // Only show active orders (not delivered/cancelled)
      setOrders((orderData.orders || []).filter((o) =>
        !['delivered', 'cancelled'].includes(o.status)
      ));
    } catch {} finally { setLoading(false); }
  }

  async function handleAddRider(e) {
    e.preventDefault();
    if (!name || !phone) return;
    setAdding(true);
    try {
      await api.post('/riders', { name, phone }, token);
      setName(''); setPhone('');
      loadData(token);
    } catch (err) { alert(err.message); }
    finally { setAdding(false); }
  }

  async function handleToggleAvailable(rider) {
    try {
      await api.put(`/riders/${rider.id}`, { is_available: !rider.is_available }, token);
      setRiders((prev) => prev.map((r) => r.id === rider.id ? { ...r, is_available: !r.is_available } : r));
    } catch (err) { alert(err.message); }
  }

  async function handleAssign(orderId, riderId) {
    setAssigning(orderId);
    try {
      const data = await api.post('/riders/assign', { order_id: orderId, rider_id: riderId }, token);
      setAssignOtp((prev) => ({ ...prev, [orderId]: data.otp }));
      // Update order status in list
      setOrders((prev) => prev.map((o) =>
        o.id === orderId ? { ...o, rider_id: riderId, status: 'out_for_delivery', delivery_otp: data.otp } : o
      ));
    } catch (err) { alert(err.message); }
    finally { setAssigning(null); }
  }

  const activeRiders = riders.filter((r) => r.is_active);

  return (
    <AdminLayout>
      <div className="adm-page">
        <div className="adm-page__header">
          <h1 className="adm-page__title">Delivery Ops</h1>
          <button className="adm-btn adm-btn--ghost" onClick={() => loadData(token)}>↻ Refresh</button>
        </div>

        {/* Add rider */}
        <div className="adm-section">
          <div className="adm-section__title">Add Rider</div>
          <form style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }} onSubmit={handleAddRider}>
            <input className="adm-input" style={{ flex: 1, minWidth: '140px' }}
              placeholder="Rider name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="adm-input" style={{ flex: 1, minWidth: '140px' }}
              placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button className="adm-btn adm-btn--primary" type="submit" disabled={adding}>
              {adding ? 'Adding...' : '+ Add Rider'}
            </button>
          </form>
        </div>

        {/* Riders list */}
        <div className="adm-section">
          <div className="adm-section__title">Riders ({riders.length})</div>
          {riders.length === 0 ? (
            <p className="adm-muted">No riders yet.</p>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr><th>Name</th><th>Phone</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {riders.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>{r.phone}</td>
                      <td>
                        <span className={`adm-badge ${r.is_available ? 'adm-badge--delivered' : 'adm-badge--cancelled'}`}>
                          {r.is_available ? 'Available' : 'Busy'}
                        </span>
                      </td>
                      <td>
                        <button className="adm-btn adm-btn--ghost" style={{ padding: '4px 10px', fontSize: '0.68rem' }}
                          onClick={() => handleToggleAvailable(r)}>
                          Toggle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Active orders — assign riders */}
        <div className="adm-section">
          <div className="adm-section__title">Active Orders — Assign Riders</div>
          {loading ? <p className="adm-muted">Loading...</p> :
           orders.length === 0 ? <p className="adm-muted">No active orders.</p> : (
            <div className="adm-order-list">
              {orders.map((order) => (
                <div key={order.id} className="adm-order-card">
                  <div className="adm-order-card__top">
                    <div>
                      <span className="adm-order-card__id">Order #{order.id}</span>
                      <span className="adm-order-card__date">₹{parseFloat(order.total).toFixed(0)}</span>
                    </div>
                    <span className={`adm-badge adm-badge--${order.status}`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="adm-order-card__address">📍 {order.delivery_address}</div>

                  {/* OTP display after assignment */}
                  {(assignOtp[order.id] || order.delivery_otp) && (
                    <div style={{
                      padding: '8px 12px',
                      background: 'rgba(0,229,160,0.08)',
                      border: '1px solid rgba(0,229,160,0.3)',
                      borderRadius: '8px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      color: 'var(--color-accent)',
                    }}>
                      🔐 OTP: <strong style={{ fontSize: '1rem', letterSpacing: '0.2em' }}>
                        {assignOtp[order.id] || order.delivery_otp}
                      </strong>
                      <span style={{ color: 'var(--color-muted)', fontSize: '0.65rem', marginLeft: '8px' }}>
                        Share with rider
                      </span>
                    </div>
                  )}

                  <div className="adm-order-card__bottom">
                    {order.status !== 'out_for_delivery' && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select className="adm-select" defaultValue=""
                          onChange={(e) => e.target.value && handleAssign(order.id, parseInt(e.target.value))}
                          disabled={assigning === order.id}>
                          <option value="">Assign rider...</option>
                          {activeRiders.map((r) => (
                            <option key={r.id} value={r.id}>{r.name} — {r.phone}</option>
                          ))}
                        </select>
                        {assigning === order.id && <span className="adm-muted">Assigning...</span>}
                      </div>
                    )}
                    {order.status === 'out_for_delivery' && (
                      <span className="adm-muted" style={{ fontSize: '0.72rem' }}>
                        🛵 Out for delivery — waiting for OTP confirmation
                      </span>
                    )}
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
