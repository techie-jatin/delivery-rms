/**
 * client/src/pages/AdminZoneEditor.jsx
 * Phase 2, Step 2.3 — Delivery zone polygon editor
 *
 * Admin draws a polygon on the map → saved to DB via PUT /outlets/:id/zone
 * Uses Leaflet.draw (loaded via CDN in index.html)
 *
 * Access: http://localhost:5173/delivery-rms/admin/zones
 */

import { useState, useEffect, useRef } from 'react';
import { fetchOutlets } from '../services/api/outlets';
import api from '../services/api/client';
import './AdminZoneEditor.css';

export default function AdminZoneEditor() {
  const mapRef       = useRef(null);
  const mapInstance  = useRef(null);
  const drawnLayer   = useRef(null);
  const drawControl  = useRef(null);

  const [outlets, setOutlets]       = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [token, setToken]           = useState('');
  const [status, setStatus]         = useState('');
  const [saving, setSaving]         = useState(false);
  const [loginMode, setLoginMode]   = useState(true);
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [loginError, setLoginError] = useState('');

  // ── Login ────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    try {
      const data = await api.post('/auth/login', { email, password });
      if (data.user.role !== 'admin') {
        setLoginError('Admin access required.');
        return;
      }
      setToken(data.token);
      setLoginMode(false);
    } catch (err) {
      setLoginError(err.message);
    }
  }

  // ── Load outlets after login ─────────────────────────────────
  useEffect(() => {
    if (!token) return;
    fetchOutlets().then((list) => {
      setOutlets(list);
      if (list.length) setSelectedId(String(list[0].id));
    });
  }, [token]);

  // ── Mount Leaflet map ────────────────────────────────────────
  useEffect(() => {
    if (loginMode || !mapRef.current) return;

    const L = window.L;
    if (!L) { setStatus('Leaflet not loaded.'); return; }

    // Centre on Kota
    const map = L.map(mapRef.current).setView([25.1792, 75.8394], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    mapInstance.current = map;

    // Layer group for drawn shapes
    const drawn = new L.FeatureGroup().addTo(map);
    drawnLayer.current = drawn;

    // Draw control — polygon only
    if (L.Control && L.Control.Draw) {
      const dc = new L.Control.Draw({
        draw: {
          polygon:   true,
          polyline:  false,
          rectangle: false,
          circle:    false,
          marker:    false,
          circlemarker: false,
        },
        edit: { featureGroup: drawn },
      });
      map.addControl(dc);
      drawControl.current = dc;

      map.on(L.Draw.Event.CREATED, (e) => {
        drawn.clearLayers();
        drawn.addLayer(e.layer);
        setStatus('Polygon drawn. Click "Save Zone" to save.');
      });

      map.on(L.Draw.Event.EDITED, () => {
        setStatus('Polygon edited. Click "Save Zone" to save.');
      });

      map.on(L.Draw.Event.DELETED, () => {
        setStatus('Polygon removed.');
      });
    } else {
      setStatus('⚠ Leaflet.draw not loaded — add it to index.html (see note below).');
    }

    return () => { map.remove(); mapInstance.current = null; };
  }, [loginMode]);

  // ── Load existing zone when outlet changes ────────────────────
  useEffect(() => {
    if (!selectedId || !mapInstance.current || !drawnLayer.current) return;

    const outlet = outlets.find((o) => String(o.id) === selectedId);
    if (!outlet) return;

    const L = window.L;
    drawnLayer.current.clearLayers();

    // Pan to outlet location
    mapInstance.current.setView([parseFloat(outlet.lat), parseFloat(outlet.lng)], 13);

    // Draw existing zone if present
    if (outlet.delivery_zone && outlet.delivery_zone.length >= 3) {
      const latlngs = outlet.delivery_zone.map(([lng, lat]) => [lat, lng]);
      const polygon = L.polygon(latlngs, {
        color: '#00e5a0',
        fillColor: '#00e5a0',
        fillOpacity: 0.15,
        weight: 2,
      });
      drawnLayer.current.addLayer(polygon);
      setStatus('Existing zone loaded. Edit or redraw, then save.');
    } else {
      setStatus('No zone yet. Draw a polygon around the delivery area.');
    }
  }, [selectedId, outlets]);

  // ── Save zone ────────────────────────────────────────────────
  async function handleSave() {
    if (!drawnLayer.current) return;

    const layers = drawnLayer.current.getLayers();
    if (!layers.length) {
      setStatus('Draw a polygon first.');
      return;
    }

    // Get coordinates from the drawn polygon
    const latlngs   = layers[0].getLatLngs()[0];
    const coordinates = latlngs.map((p) => [p.lng, p.lat]); // GeoJSON: [lng, lat]

    setSaving(true);
    setStatus('Saving...');

    try {
      await api.put(`/outlets/${selectedId}/zone`, { coordinates }, token);
      setStatus('✓ Zone saved successfully!');

      // Refresh outlets so the saved zone shows on reload
      const updated = await fetchOutlets();
      setOutlets(updated);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // ── Login screen ─────────────────────────────────────────────
  if (loginMode) {
    return (
      <div className="aze-login">
        <h1 className="aze-login__title">⌖ Zone Editor</h1>
        <p className="aze-login__sub">Admin login required</p>
        <form className="aze-login__form" onSubmit={handleLogin}>
          <input
            className="aze-input"
            type="email"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="aze-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {loginError && <p className="aze-error">{loginError}</p>}
          <button className="aze-btn aze-btn--primary" type="submit">
            Login
          </button>
        </form>
      </div>
    );
  }

  // ── Editor screen ─────────────────────────────────────────────
  return (
    <div className="aze">
      <div className="aze-header">
        <h1 className="aze-header__title">⌖ Delivery Zone Editor</h1>
        <div className="aze-header__controls">
          <select
            className="aze-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {outlets.map((o) => (
              <option key={o.id} value={String(o.id)}>{o.name}</option>
            ))}
          </select>
          <button
            className="aze-btn aze-btn--primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : '✓ Save Zone'}
          </button>
        </div>
      </div>

      {status && (
        <div className={`aze-status${status.startsWith('✓') ? ' aze-status--ok' : ''}`}>
          {status}
        </div>
      )}

      <div ref={mapRef} className="aze-map" />

      <div className="aze-help">
        <strong>How to use:</strong> Select an outlet → click the polygon tool (pentagon icon on the left) → click points to draw the delivery boundary → double-click to finish → click "Save Zone".
      </div>
    </div>
  );
}
