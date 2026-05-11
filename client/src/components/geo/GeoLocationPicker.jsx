/**
 * GeoLocationPicker.jsx
 * ─────────────────────────────────────────────────────────────────
 * The customer-facing location picker — ported from geolocation_map_picker.html
 * into a reusable React component.
 *
 * What it does:
 *   • "Detect My Location" → GPS → shows Leaflet map with draggable pin
 *   • User can drag pin or click map to adjust position
 *   • Shows lat/lng + delivery zone result (serviceable / fee / ETA)
 *   • On confirm → calls onConfirm({ lat, lng, outlet, fee, etaMinutes })
 *
 * Where it's used:
 *   • Homepage location gate (Phase 3.2)
 *   • Checkout address step (Phase 3.4)
 *
 * Props:
 *   outlets    {Object[]}  pre-fetched outlet list (from GET /outlets)
 *   onConfirm  {Function}  called with confirmed position + service info
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from 'react';
import { useGeoLocation } from '../../hooks/useGeoLocation';
import { mountMap, moveMarker, destroyMap } from '../../services/geo/geoProvider';
import './GeoLocationPicker.css';

export default function GeoLocationPicker({ outlets = [], onConfirm }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef  = useRef(null);
  const hintTimerRef    = useRef(null);
  const [showHint, setShowHint]     = useState(false);
  const [hintFading, setHintFading] = useState(false);

  const { position, detecting, error, serviceInfo, detect, setPosition } = useGeoLocation({ outlets });

  // ── Mount map once we have a position ────────────────────────────
  useEffect(() => {
    if (!position || mapInstanceRef.current) return;

    // Small delay so the container is visible in the DOM
    const id = setTimeout(() => {
      mapInstanceRef.current = mountMap(
        mapContainerRef.current,
        position.lat,
        position.lng,
        setPosition          // called on every pin drag / map click
      );
      setShowHint(true);

      // Auto-fade hint after 4 s
      hintTimerRef.current = setTimeout(() => {
        setHintFading(true);
        setTimeout(() => setShowHint(false), 800);
      }, 4000);
    }, 50);

    return () => clearTimeout(id);
  }, [position, setPosition]);

  // ── Move pin when position updates (re-detect) ───────────────────
  useEffect(() => {
    if (!position || !mapInstanceRef.current) return;
    moveMarker(mapInstanceRef.current, position.lat, position.lng);
  }, [position]);

  // ── Teardown on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(hintTimerRef.current);
      destroyMap(mapInstanceRef.current);
      mapInstanceRef.current = null;
    };
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────
  function handleConfirm() {
    if (!position || !serviceInfo?.serviceable) return;
    onConfirm?.({
      lat: position.lat,
      lng: position.lng,
      outlet: serviceInfo.outlet,
      fee: serviceInfo.fee,
      etaMinutes: serviceInfo.etaMinutes ?? null,
    });
  }

  const hasPosition    = !!position;
  const isServiceable  = serviceInfo?.serviceable === true;
  const isNotServiceable = serviceInfo?.serviceable === false;

  return (
    <div className="geopin">
      {/* ── Header ── */}
      <div className="geopin__header">
        <h2 className="geopin__title">⌖ Set your location</h2>
        <p className="geopin__sub">detect → drag pin → confirm</p>
      </div>

      {/* ── Detect button ── */}
      <button
        className="geopin__detect-btn"
        onClick={detect}
        disabled={detecting}
      >
        {detecting ? (
          <><span className="geopin__spinner" aria-hidden="true" /> Detecting…</>
        ) : (
          '📍 Detect My Location'
        )}
      </button>

      {/* ── Error ── */}
      {error && <p className="geopin__error" role="alert">{error}</p>}

      {/* ── Map ── */}
      <div
        className={`geopin__map-wrap${hasPosition ? ' geopin__map-wrap--visible' : ''}`}
        aria-hidden={!hasPosition}
      >
        <div ref={mapContainerRef} className="geopin__map" />
        {showHint && (
          <div className={`geopin__hint${hintFading ? ' geopin__hint--fade' : ''}`}>
            drag the pin or click anywhere to move it
          </div>
        )}
      </div>

      {/* ── Coordinate card ── */}
      {hasPosition && (
        <div className="geopin__coord-card">
          <div className="geopin__coord-row">
            <div className="geopin__coord-item">
              <div className="geopin__coord-label">Latitude</div>
              <div className="geopin__coord-value">{position.lat.toFixed(6)}</div>
            </div>
            <div className="geopin__coord-item">
              <div className="geopin__coord-label">Longitude</div>
              <div className="geopin__coord-value">{position.lng.toFixed(6)}</div>
            </div>
          </div>

          {/* ── Service status ── */}
          {serviceInfo && (
            <div className={`geopin__service${isServiceable ? ' geopin__service--ok' : ' geopin__service--err'}`}>
              {isServiceable ? (
                <>
                  <span className="geopin__service-icon">✓</span>
                  <span>
                    Delivery available · {serviceInfo.outlet?.name}
                    {serviceInfo.fee != null && ` · ₹${serviceInfo.fee} fee`}
                    {serviceInfo.etaMinutes != null && ` · ~${serviceInfo.etaMinutes} min`}
                    {!serviceInfo.confirmed && ' (checking…)'}
                  </span>
                </>
              ) : (
                <>
                  <span className="geopin__service-icon">✕</span>
                  <span>Delivery not available in this area yet.</span>
                </>
              )}
            </div>
          )}

          {/* ── Action buttons ── */}
          <div className="geopin__btn-group">
            <button className="geopin__btn geopin__btn--secondary" onClick={detect}>
              🔄 Re-detect
            </button>
            <button
              className="geopin__btn geopin__btn--primary"
              onClick={handleConfirm}
              disabled={!isServiceable}
            >
              ✓ Confirm Location
            </button>
          </div>
        </div>
      )}

      {/* ── Not serviceable message ── */}
      {isNotServiceable && (
        <div className="geopin__out-of-range">
          <p>We don't deliver to this area yet.</p>
          <p className="geopin__out-of-range-sub">Try adjusting the pin or check back soon.</p>
        </div>
      )}
    </div>
  );
}
