/**
 * server/src/routes/rider.routes.js
 * Phase 10 — Delivery ops
 *
 * GET  /api/v1/riders                    — admin: list all riders
 * POST /api/v1/riders                    — admin: add rider
 * PUT  /api/v1/riders/:id                — admin: update rider
 *
 * POST /api/v1/riders/assign             — admin: assign rider to order
 * POST /api/v1/riders/verify-otp         — rider: verify OTP to confirm delivery
 * GET  /api/v1/riders/my-orders          — rider: see assigned orders
 */

const express            = require('express');
const router             = express.Router();
const crypto             = require('crypto');
const db                 = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getIO }          = require('../socket');

// ── Generate 4-digit OTP ──────────────────────────────────────────
function generateOTP() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// ── GET /riders — admin ───────────────────────────────────────────
router.get('/', requireAdmin, async (req, res) => {
  try {
    const riders = await db('riders').orderBy('name');
    return res.json({ riders });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── POST /riders — admin: add rider ──────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'name and phone are required.' });
  }
  try {
    const [rider] = await db('riders').insert({ name, phone }).returning('*');
    return res.status(201).json({ rider });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── PUT /riders/:id — admin: update rider ─────────────────────────
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, phone, is_active, is_available } = req.body;
  try {
    const [updated] = await db('riders').where({ id: req.params.id }).update({
      ...(name         != null && { name }),
      ...(phone        != null && { phone }),
      ...(is_active    != null && { is_active }),
      ...(is_available != null && { is_available }),
      updated_at: db.fn.now(),
    }).returning('*');
    if (!updated) return res.status(404).json({ error: 'Rider not found.' });
    return res.json({ rider: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── POST /riders/assign — admin: assign rider + generate OTP ─────
// Body: { order_id, rider_id }

router.post('/assign', requireAdmin, async (req, res) => {
  const { order_id, rider_id } = req.body;
  if (!order_id || !rider_id) {
    return res.status(400).json({ error: 'order_id and rider_id are required.' });
  }

  try {
    const otp = generateOTP();

    const [order] = await db('orders')
      .where({ id: order_id })
      .update({
        rider_id,
        delivery_otp: otp,
        status:       'out_for_delivery',
        updated_at:   db.fn.now(),
      })
      .returning('*');

    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // Emit socket — customer sees status update instantly
    try {
      const io = getIO();
      io.to(`order:${order_id}`).emit('order:status', { orderId: order.id, status: 'out_for_delivery' });
      io.to(`user:${order.user_id}`).emit('order:status', { orderId: order.id, status: 'out_for_delivery' });
    } catch {}

    return res.json({
      order,
      otp,      // show to admin so they can relay to rider
      message:  `Rider assigned. OTP: ${otp}`,
    });

  } catch (err) {
    console.error('[riders/assign]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── POST /riders/verify-otp — rider confirms delivery ────────────
// Body: { order_id, otp }

router.post('/verify-otp', requireAuth, async (req, res) => {
  const { order_id, otp } = req.body;
  if (!order_id || !otp) {
    return res.status(400).json({ error: 'order_id and otp are required.' });
  }

  try {
    const order = await db('orders').where({ id: order_id }).first();
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    if (order.delivery_otp !== String(otp)) {
      return res.status(400).json({ error: 'Invalid OTP. Please check and try again.' });
    }

    if (order.otp_verified_at) {
      return res.status(400).json({ error: 'This order has already been delivered.' });
    }

    const [updated] = await db('orders').where({ id: order_id }).update({
      status:           'delivered',
      otp_verified_at:  db.fn.now(),
      delivered_at:     db.fn.now(),
      updated_at:       db.fn.now(),
    }).returning('*');

    // Emit socket — customer sees "Delivered" instantly
    try {
      const io = getIO();
      io.to(`order:${order_id}`).emit('order:status', { orderId: updated.id, status: 'delivered' });
      io.to(`user:${updated.user_id}`).emit('order:status', { orderId: updated.id, status: 'delivered' });
    } catch {}

    return res.json({ order: updated, message: 'Delivery confirmed!' });

  } catch (err) {
    console.error('[riders/verify-otp]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── GET /riders/my-orders — rider's assigned orders ───────────────
router.get('/my-orders', requireAuth, async (req, res) => {
  try {
    // Find rider record for this user
    const rider = await db('riders').where({ user_id: req.user.id }).first();
    if (!rider) {
      return res.status(403).json({ error: 'No rider profile found for this account.' });
    }

    const orders = await db('orders')
      .where({ rider_id: rider.id })
      .whereNotIn('status', ['delivered', 'cancelled'])
      .orderBy('created_at', 'desc');

    const ordersWithItems = await Promise.all(orders.map(async (o) => {
      const items = await db('order_items').where({ order_id: o.id });
      return { ...o, items };
    }));

    return res.json({ orders: ordersWithItems, rider });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
