/**
 * client/src/pages/Home.jsx
 * Phase 3.2 — Homepage with location gate
 *
 * Flow:
 *   1. App loads → fetch outlets from backend
 *   2. Show "Detect My Location" button
 *   3. User detects → GeoLocationPicker shows map
 *   4. User confirms → show product feed (Phase 3.3 builds this out)
 */

import { useState, useEffect } from 'react';
import GeoLocationPicker from '../components/geo/GeoLocationPicker';
import { fetchOutlets } from '../services/api/outlets';
import './Home.css';

export default function Home() {
  const [outlets, setOutlets]       = useState([]);
  const [confirmed, setConfirmed]   = useState(null); // { lat, lng, outlet, fee, etaMinutes }
  const [loadingOutlets, setLoadingOutlets] = useState(true);

  // Fetch outlets once on mount
  useEffect(() => {
    fetchOutlets()
      .then(setOutlets)
      .catch(() => setOutlets([]))
      .finally(() => setLoadingOutlets(false));
  }, []);

  // Called by GeoLocationPicker when user confirms location
  function handleLocationConfirmed(info) {
    setConfirmed(info);
  }

  // ── Loading ───────────────────────────────────────────────────
  if (loadingOutlets) {
    return (
      <div className="home-loading">
        <span className="home-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  // ── Location confirmed — show product feed ────────────────────
  if (confirmed) {
    return (
      <div className="home-feed">
        {/* Outlet banner */}
        <div className="home-banner">
          <div className="home-banner__left">
            <span className="home-banner__icon">📍</span>
            <div>
              <div className="home-banner__outlet">{confirmed.outlet?.name}</div>
              <div className="home-banner__meta">
                {confirmed.etaMinutes ? `~${confirmed.etaMinutes} min` : ''}
                {confirmed.fee === 0
                  ? ' · Free delivery'
                  : confirmed.fee != null
                    ? ` · ₹${confirmed.fee} delivery`
                    : ''}
              </div>
            </div>
          </div>
          <button
            className="home-banner__change"
            onClick={() => setConfirmed(null)}
          >
            Change
          </button>
        </div>

        {/* Product feed — Phase 3.3 will build this out */}
        <div className="home-feed__placeholder">
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🛒</div>
          <p style={{ color: 'var(--color-text)', fontWeight: 600 }}>
            Location confirmed!
          </p>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.8rem', marginTop: '6px' }}>
            Product feed built in Phase 3.3
          </p>
          <div style={{
            marginTop: '20px',
            padding: '14px 20px',
            background: 'rgba(0,229,160,0.08)',
            border: '1px solid rgba(0,229,160,0.2)',
            borderRadius: '10px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            color: 'var(--color-accent)',
            textAlign: 'left',
          }}>
            <div>outlet: {confirmed.outlet?.name}</div>
            <div>lat: {confirmed.lat?.toFixed(6)}</div>
            <div>lng: {confirmed.lng?.toFixed(6)}</div>
            <div>fee: ₹{confirmed.fee}</div>
            <div>eta: {confirmed.etaMinutes} min</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Default — show location picker ───────────────────────────
  return (
    <div className="home-gate">
      <div className="home-gate__hero">
        <div className="home-gate__icon">🛒</div>
        <h1 className="home-gate__title">Delivery RMS</h1>
        <p className="home-gate__sub">
          Groceries delivered in minutes · Kota
        </p>
      </div>

      <GeoLocationPicker
        outlets={outlets}
        onConfirm={handleLocationConfirmed}
      />
    </div>
  );
}
