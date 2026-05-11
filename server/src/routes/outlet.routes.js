/**
 * server/src/routes/outlet.routes.js
 * Phase 1, Step 1.6 — Outlet management API
 *
 * GET  /api/v1/outlets          — public, all active outlets + geo data
 * GET  /api/v1/outlets/:id      — public, single outlet
 * POST /api/v1/outlets          — admin only, create outlet
 * PUT  /api/v1/outlets/:id      — admin only, update outlet
 * PUT  /api/v1/outlets/:id/zone — admin only, set delivery polygon (GeoJSON)
 */

const express            = require('express');
const router             = express.Router();
const db                 = require('../db');
const { requireAdmin }   = require('../middleware/auth');

// ── GET /outlets ──────────────────────────────────────────────────
// Public. Frontend downloads this on app load for local geo check.
// Returns lat, lng, delivery_radius_km, and delivery_zone polygon.

router.get('/', async (req, res) => {
  try {
    const outlets = await db.raw(`
      SELECT
        id, name, address, lat, lng,
        delivery_radius_km,
        free_delivery_above,
        is_active,
        ST_AsGeoJSON(delivery_zone)::json AS delivery_zone
      FROM outlets
      WHERE is_active = true
      ORDER BY name
    `);

    // Parse delivery_zone coordinates into flat array for Turf.js
    const result = outlets.rows.map((o) => ({
      ...o,
      delivery_zone: o.delivery_zone
        ? o.delivery_zone.coordinates[0] // array of [lng, lat] pairs
        : null,
    }));

    return res.json({ outlets: result });

  } catch (err) {
    console.error('[outlets/list]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── GET /outlets/:id ──────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const rows = await db.raw(`
      SELECT
        id, name, address, lat, lng,
        delivery_radius_km,
        free_delivery_above,
        is_active,
        ST_AsGeoJSON(delivery_zone)::json AS delivery_zone
      FROM outlets
      WHERE id = ?
    `, [req.params.id]);

    if (!rows.rows.length) {
      return res.status(404).json({ error: 'Outlet not found.' });
    }

    const o = rows.rows[0];
    return res.json({
      outlet: {
        ...o,
        delivery_zone: o.delivery_zone
          ? o.delivery_zone.coordinates[0]
          : null,
      },
    });

  } catch (err) {
    console.error('[outlets/get]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── POST /outlets ─────────────────────────────────────────────────
// Admin only.
// Body: { name, address, lat, lng, delivery_radius_km, free_delivery_above }

router.post('/', requireAdmin, async (req, res) => {
  const {
    name, address, lat, lng,
    delivery_radius_km = 5,
    free_delivery_above = 499,
  } = req.body;

  if (!name || !address || lat == null || lng == null) {
    return res.status(400).json({ error: 'name, address, lat and lng are required.' });
  }

  try {
    const [outlet] = await db('outlets')
      .insert({ name, address, lat, lng, delivery_radius_km, free_delivery_above })
      .returning(['id', 'name', 'address', 'lat', 'lng',
                  'delivery_radius_km', 'free_delivery_above', 'is_active']);

    return res.status(201).json({ outlet });

  } catch (err) {
    console.error('[outlets/create]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── PUT /outlets/:id ──────────────────────────────────────────────
// Admin only. Update basic outlet info.

router.put('/:id', requireAdmin, async (req, res) => {
  const {
    name, address, lat, lng,
    delivery_radius_km, free_delivery_above, is_active,
  } = req.body;

  try {
    const [updated] = await db('outlets')
      .where({ id: req.params.id })
      .update({
        ...(name               != null && { name }),
        ...(address            != null && { address }),
        ...(lat                != null && { lat }),
        ...(lng                != null && { lng }),
        ...(delivery_radius_km != null && { delivery_radius_km }),
        ...(free_delivery_above!= null && { free_delivery_above }),
        ...(is_active          != null && { is_active }),
        updated_at: db.fn.now(),
      })
      .returning(['id', 'name', 'address', 'lat', 'lng',
                  'delivery_radius_km', 'free_delivery_above', 'is_active']);

    if (!updated) {
      return res.status(404).json({ error: 'Outlet not found.' });
    }

    return res.json({ outlet: updated });

  } catch (err) {
    console.error('[outlets/update]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── PUT /outlets/:id/zone ─────────────────────────────────────────
// Admin only. Save delivery zone polygon drawn on the map.
// Body: { coordinates: [[lng, lat], [lng, lat], ...] }
// (GeoJSON order: longitude first, latitude second)

router.put('/:id/zone', requireAdmin, async (req, res) => {
  const { coordinates } = req.body;

  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
    return res.status(400).json({ error: 'coordinates must be an array of at least 3 [lng, lat] pairs.' });
  }

  // GeoJSON polygons must close — first and last point must match
  const closed = [...coordinates];
  const first = closed[0];
  const last  = closed[closed.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    closed.push(first);
  }

  // Build GeoJSON polygon string for PostGIS
  const geojson = JSON.stringify({
    type: 'Polygon',
    coordinates: [closed],
  });

  try {
    await db.raw(`
      UPDATE outlets
      SET delivery_zone = ST_SetSRID(ST_GeomFromGeoJSON(?), 4326),
          updated_at    = NOW()
      WHERE id = ?
    `, [geojson, req.params.id]);

    return res.json({ message: 'Delivery zone saved.' });

  } catch (err) {
    console.error('[outlets/zone]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
