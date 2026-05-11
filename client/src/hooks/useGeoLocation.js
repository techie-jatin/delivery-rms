/**
 * useGeoLocation.js
 * ─────────────────────────────────────────────────────────────────
 * React hook that manages the full geo flow:
 *   1. Detect user position (browser Geolocation API)
 *   2. Run local delivery zone check (instant, no server)
 *   3. Confirm with backend (POST /delivery/check)
 *
 * Components import this hook — they never call geoProvider or
 * deliveryZone directly. All provider-switching happens in those
 * files, not here.
 *
 * Usage:
 *   const {
 *     position,        // { lat, lng, accuracy } | null
 *     detecting,       // boolean — spinner state
 *     error,           // string | null
 *     serviceInfo,     // { outlet, distanceKm, fee, confirmed } | null
 *     detect,          // fn — call on button click
 *     setPosition,     // fn — call when user drags pin
 *   } = useGeoLocation({ outlets });
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useCallback, useRef } from 'react';
import { detectPosition } from '../services/geo/geoProvider';
import { findNearestServiceableOutlet } from '../services/geo/deliveryZone';

/**
 * @param {Object}   opts
 * @param {Object[]} opts.outlets  - pre-fetched from GET /outlets
 */
export function useGeoLocation({ outlets = [] } = {}) {
  const [position, setPositionState] = useState(null);
  const [detecting, setDetecting]   = useState(false);
  const [error, setError]           = useState(null);
  const [serviceInfo, setServiceInfo] = useState(null);

  // Track latest backend check so stale responses are ignored
  const checkIdRef = useRef(0);

  /**
   * Run local zone check + kick off backend confirmation.
   * Called both after GPS detect and after user drags pin.
   */
  const runZoneCheck = useCallback(async (lat, lng) => {
    setServiceInfo(null);

    // ── 1. Local check (instant) ─────────────────────────────────
    const localResult = findNearestServiceableOutlet(lat, lng, outlets);

    if (!localResult) {
      setServiceInfo({ serviceable: false, outlet: null, distanceKm: null, fee: null, confirmed: false });
      return;
    }

    // Show provisional result immediately
    setServiceInfo({
      ...localResult,
      serviceable: true,
      confirmed: false, // not yet backend-confirmed
    });

    // ── 2. Backend confirmation (async, POST /delivery/check) ─────
    const myCheckId = ++checkIdRef.current;

    try {
      const res = await fetch('/api/v1/delivery/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      const data = await res.json();

      // Discard if a newer check has been started
      if (checkIdRef.current !== myCheckId) return;

      setServiceInfo({
        serviceable: data.serviceable,
        outlet: data.outlet ?? localResult.outlet,
        distanceKm: data.distance_km ?? localResult.distanceKm,
        fee: data.delivery_fee ?? localResult.fee,
        etaMinutes: data.eta_minutes ?? null,
        confirmed: true,
      });
    } catch {
      // Backend unreachable — fall back to local result
      if (checkIdRef.current !== myCheckId) return;
      setServiceInfo((prev) => prev ? { ...prev, confirmed: true } : null);
    }
  }, [outlets]);

  /**
   * Trigger GPS detection.
   * Called by "Detect My Location" button.
   */
  const detect = useCallback(async () => {
    setDetecting(true);
    setError(null);
    setServiceInfo(null);

    try {
      const pos = await detectPosition();
      setPositionState(pos);
      await runZoneCheck(pos.lat, pos.lng);
    } catch (err) {
      setError(err.message);
    } finally {
      setDetecting(false);
    }
  }, [runZoneCheck]);

  /**
   * Called when user drags the pin to a new position.
   * Updates coordinates and re-runs zone check.
   *
   * @param {{ lat: number, lng: number }} newPos
   */
  const setPosition = useCallback((newPos) => {
    setPositionState((prev) => ({ ...prev, ...newPos }));
    runZoneCheck(newPos.lat, newPos.lng);
  }, [runZoneCheck]);

  return {
    position,
    detecting,
    error,
    serviceInfo,
    detect,
    setPosition,
  };
}
