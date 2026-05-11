/**
 * client/src/hooks/useGeoLocation.js
 * React hook that manages the full geo flow:
 *   1. Detect user position (browser Geolocation API)
 *   2. Run local delivery zone check (instant, no server)
 *   3. Confirm with backend (POST /delivery/check)
 */

import { useState, useCallback, useRef } from 'react';
import { detectPosition } from '../services/geo/geoProvider';
import { findNearestServiceableOutlet } from '../services/geo/deliveryZone';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function useGeoLocation({ outlets = [] } = {}) {
  const [position, setPositionState] = useState(null);
  const [detecting, setDetecting]    = useState(false);
  const [error, setError]            = useState(null);
  const [serviceInfo, setServiceInfo] = useState(null);

  const checkIdRef = useRef(0);

  const runZoneCheck = useCallback(async (lat, lng) => {
    setServiceInfo(null);

    // 1. Local check (instant)
    const localResult = findNearestServiceableOutlet(lat, lng, outlets);

    if (!localResult) {
      setServiceInfo({ serviceable: false, outlet: null, distanceKm: null, fee: null, confirmed: false });
      return;
    }

    setServiceInfo({ ...localResult, serviceable: true, confirmed: false });

    // 2. Backend confirmation
    const myCheckId = ++checkIdRef.current;

    try {
      const res = await fetch(`${API_BASE}/api/v1/delivery/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      const data = await res.json();

      if (checkIdRef.current !== myCheckId) return;

      setServiceInfo({
        serviceable: data.serviceable,
        outlet:      data.outlet      ?? localResult.outlet,
        distanceKm:  data.distance_km ?? localResult.distanceKm,
        fee:         data.delivery_fee ?? localResult.fee,
        etaMinutes:  data.eta_minutes  ?? null,
        confirmed:   true,
      });
    } catch {
      if (checkIdRef.current !== myCheckId) return;
      setServiceInfo((prev) => prev ? { ...prev, confirmed: true } : null);
    }
  }, [outlets]);

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

  const setPosition = useCallback((newPos) => {
    setPositionState((prev) => ({ ...prev, ...newPos }));
    runZoneCheck(newPos.lat, newPos.lng);
  }, [runZoneCheck]);

  return { position, detecting, error, serviceInfo, detect, setPosition };
}
