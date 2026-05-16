/**
 * server/src/routes/delivery.routes.js
 * POST /api/v1/delivery/check
 *
 * PostGIS-free version — uses Haversine distance + ray-casting polygon check
 * entirely in JavaScript. Works on Railway standard Postgres.
 *
 * When moving to VPS with PostGIS: see docs/GEO_SWITCH.md
 */

const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ── Haversine distance (km) ───────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// ── Ray-casting polygon check ─────────────────────────────────────
function isPointInPolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

// ── Fee tiers ─────────────────────────────────────────────────────
function calcDeliveryFee(distanceKm) {
  if (distanceKm <= 2) return 20;
  if (distanceKm <= 5) return 40;
  if (distanceKm <= 8) return 70;
  return null;
}

function estimateEta(distanceKm) {
  return Math.round((distanceKm / 20) * 60 + 5);
}

// ── POST /delivery/check ──────────────────────────────────────────
router.post('/check', async (req, res) => {
  const { lat, lng } = req.body;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat and lng must be numbers.' });
  }

  try {
    const outlets = await db('outlets').where({ is_active: true });

    let best = null;

    for (const outlet of outlets) {
      const outletLat = parseFloat(outlet.lat);
      const outletLng = parseFloat(outlet.lng);
      const distanceKm = haversineKm(lat, lng, outletLat, outletLng);

      let inZone = false;

      // Polygon check if zone exists (stored as JSONB)
      if (outlet.delivery_zone) {
        const zone = typeof outlet.delivery_zone === 'string'
          ? JSON.parse(outlet.delivery_zone)
          : outlet.delivery_zone;
        const coords = zone.coordinates?.[0] || zone;
        if (coords && coords.length >= 3) {
          inZone = isPointInPolygon(lat, lng, coords);
        }
      }

      // Fallback to radius
      if (!inZone) {
        inZone = distanceKm <= parseFloat(outlet.delivery_radius_km || 5);
      }

      if (!inZone) continue;

      if (!best || distanceKm < best.distanceKm) {
        best = { outlet, distanceKm };
      }
    }

    if (!best) {
      return res.json({ serviceable: false });
    }

    const fee = calcDeliveryFee(best.distanceKm);
    const eta = estimateEta(best.distanceKm);

    return res.json({
      serviceable:  true,
      outlet: {
        id:   best.outlet.id,
        name: best.outlet.name,
        lat:  best.outlet.lat,
        lng:  best.outlet.lng,
      },
      distance_km:  Math.round(best.distanceKm * 100) / 100,
      delivery_fee: fee,
      eta_minutes:  eta,
    });

  } catch (err) {
    console.error('[delivery/check]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
