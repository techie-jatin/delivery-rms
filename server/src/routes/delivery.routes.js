/**
 * server/src/routes/delivery.routes.js
 * POST /api/v1/delivery/check
 *
 * Validates user lat/lng against PostGIS delivery zones.
 * Returns serviceable outlet, fee, ETA.
 *
 * Built in Phase 2, Step 2.1.
 * Current implementation: PostGIS ST_Within (free)
 * Future: Google Maps Directions API for road ETA (commented below)
 */

const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.post('/check', async (req, res) => {
  const { lat, lng } = req.body;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat and lng must be numbers.' });
  }

  try {
    const results = await db.raw(`
      SELECT
        o.id,
        o.name,
        o.lat,
        o.lng,
        ST_Distance(
          ST_MakePoint(o.lng, o.lat)::geography,
          ST_MakePoint(:lng, :lat)::geography
        ) / 1000 AS distance_km
      FROM outlets o
      WHERE
        o.is_active = true
        AND (
          (o.delivery_zone IS NOT NULL
           AND ST_Within(
             ST_SetSRID(ST_MakePoint(:lng, :lat), 4326),
             o.delivery_zone
           ))
          OR
          (o.delivery_zone IS NULL
           AND ST_Distance(
             ST_MakePoint(o.lng, o.lat)::geography,
             ST_MakePoint(:lng, :lat)::geography
           ) / 1000 <= o.delivery_radius_km)
        )
      ORDER BY distance_km ASC
      LIMIT 1
    `, { lat, lng });

    if (!results.rows.length) {
      return res.json({ serviceable: false });
    }

    const outlet      = results.rows[0];
    const distanceKm  = parseFloat(outlet.distance_km);
    const deliveryFee = calcDeliveryFee(distanceKm);
    const etaMinutes  = estimateEta(distanceKm);

    return res.json({
      serviceable:  true,
      outlet:       { id: outlet.id, name: outlet.name, lat: outlet.lat, lng: outlet.lng },
      distance_km:  Math.round(distanceKm * 100) / 100,
      delivery_fee: deliveryFee,
      eta_minutes:  etaMinutes,
    });

  } catch (err) {
    console.error('[delivery/check]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

function calcDeliveryFee(distanceKm) {
  if (distanceKm <= 2) return 20;
  if (distanceKm <= 5) return 40;
  if (distanceKm <= 8) return 70;
  return null;
}

function estimateEta(distanceKm) {
  return Math.round((distanceKm / 20) * 60 + 5);
}

module.exports = router;

// ════════════════════════════════════════════════════════════════
//  GOOGLE MAPS DIRECTIONS API  (FUTURE — NOT ACTIVE)
//  npm install @googlemaps/google-maps-services-js
//  Add GOOGLE_MAPS_KEY to server/.env
// ════════════════════════════════════════════════════════════════

/*
const { Client } = require('@googlemaps/google-maps-services-js');
const googleMapsClient = new Client({});

async function getRoadEta(originLat, originLng, destLat, destLng) {
  const response = await googleMapsClient.directions({
    params: {
      origin:      { lat: originLat, lng: originLng },
      destination: { lat: destLat,   lng: destLng   },
      mode:        'driving',
      key:         process.env.GOOGLE_MAPS_KEY,
    },
  });
  const leg = response.data.routes?.[0]?.legs?.[0];
  if (!leg) return null;
  return Math.round(leg.duration.value / 60) + 5; // seconds → minutes + prep
}
*/
