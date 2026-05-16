/**
 * server/src/routes/outlet.routes.js
 * PostGIS-free version — delivery_zone stored as JSONB.
 */

const express          = require('express');
const router           = express.Router();
const db               = require('../db');
const { requireAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const outlets = await db('outlets').where({ is_active: true }).orderBy('name');
    const result = outlets.map((o) => ({
      ...o,
      delivery_zone: o.delivery_zone
        ? (typeof o.delivery_zone === 'string' ? JSON.parse(o.delivery_zone) : o.delivery_zone)
        : null,
    }));
    return res.json({ outlets: result });
  } catch (err) {
    console.error('[outlets/list]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const outlet = await db('outlets').where({ id: req.params.id }).first();
    if (!outlet) return res.status(404).json({ error: 'Outlet not found.' });
    return res.json({
      outlet: {
        ...outlet,
        delivery_zone: outlet.delivery_zone
          ? (typeof outlet.delivery_zone === 'string' ? JSON.parse(outlet.delivery_zone) : outlet.delivery_zone)
          : null,
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { name, address, lat, lng, delivery_radius_km = 5, free_delivery_above = 499 } = req.body;
  if (!name || !address || lat == null || lng == null) {
    return res.status(400).json({ error: 'name, address, lat and lng are required.' });
  }
  try {
    const [outlet] = await db('outlets')
      .insert({ name, address, lat, lng, delivery_radius_km, free_delivery_above })
      .returning(['id','name','address','lat','lng','delivery_radius_km','free_delivery_above','is_active']);
    return res.status(201).json({ outlet });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { name, address, lat, lng, delivery_radius_km, free_delivery_above, is_active } = req.body;
  try {
    const [updated] = await db('outlets').where({ id: req.params.id }).update({
      ...(name               != null && { name }),
      ...(address            != null && { address }),
      ...(lat                != null && { lat }),
      ...(lng                != null && { lng }),
      ...(delivery_radius_km != null && { delivery_radius_km }),
      ...(free_delivery_above!= null && { free_delivery_above }),
      ...(is_active          != null && { is_active }),
      updated_at: db.fn.now(),
    }).returning(['id','name','address','lat','lng','delivery_radius_km','free_delivery_above','is_active']);
    if (!updated) return res.status(404).json({ error: 'Outlet not found.' });
    return res.json({ outlet: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Save delivery zone as JSONB
router.put('/:id/zone', requireAdmin, async (req, res) => {
  const { coordinates } = req.body;
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
    return res.status(400).json({ error: 'coordinates must be an array of at least 3 [lng, lat] pairs.' });
  }
  const closed = [...coordinates];
  const first = closed[0]; const last = closed[closed.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) closed.push(first);

  try {
    await db('outlets').where({ id: req.params.id }).update({
      delivery_zone: JSON.stringify(closed),
      updated_at: db.fn.now(),
    });
    return res.json({ message: 'Delivery zone saved.' });
  } catch (err) {
    console.error('[outlets/zone]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
