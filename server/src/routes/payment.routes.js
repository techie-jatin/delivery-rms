/**
 * server/src/routes/payment.routes.js
 * Phase 6 — Razorpay payment integration
 *
 * POST /api/v1/payments/create-order   — create Razorpay order
 * POST /api/v1/payments/verify         — verify payment signature
 * POST /api/v1/payments/webhook        — Razorpay webhook (server-to-server)
 */

const express          = require('express');
const router           = express.Router();
const Razorpay         = require('razorpay');
const crypto           = require('crypto');
const db               = require('../db');
const { requireAuth }  = require('../middleware/auth');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── POST /payments/create-order ───────────────────────────────────
// Creates a Razorpay order for the current cart total.
// Called before opening the Razorpay payment popup.
// Body: { delivery_address, outlet_id }

router.post('/create-order', requireAuth, async (req, res) => {
  const { delivery_address, outlet_id } = req.body;

  if (!delivery_address || !outlet_id) {
    return res.status(400).json({ error: 'delivery_address and outlet_id are required.' });
  }

  try {
    // Load cart
    const cart = await db('carts').where({ user_id: req.user.id }).first();
    if (!cart) return res.status(400).json({ error: 'Cart is empty.' });

    const items = await db('cart_items as ci')
      .join('product_variants as v', 'v.id', 'ci.variant_id')
      .where('ci.cart_id', cart.id)
      .select('ci.quantity', 'v.price', 'v.stock', 'v.max_qty_per_order');

    if (!items.length) return res.status(400).json({ error: 'Cart is empty.' });

    // Re-validate stock + qty
    for (const item of items) {
      if (item.quantity > item.max_qty_per_order) {
        return res.status(400).json({ error: 'Quantity limit exceeded.' });
      }
      if (item.quantity > item.stock) {
        return res.status(400).json({ error: 'Insufficient stock.' });
      }
    }

    const subtotal    = items.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);
    const deliveryFee = subtotal >= 499 ? 0 : 40;
    const total       = Math.round((subtotal + deliveryFee) * 100); // paise

    // Create Razorpay order
    const rzpOrder = await razorpay.orders.create({
      amount:   total,           // in paise
      currency: 'INR',
      receipt:  `cart_${cart.id}_${Date.now()}`,
      notes: {
        user_id:          req.user.id,
        outlet_id,
        delivery_address,
      },
    });

    return res.json({
      razorpay_order_id: rzpOrder.id,
      amount:            total,
      currency:          'INR',
      key_id:            process.env.RAZORPAY_KEY_ID,
      prefill: {
        name:  req.user.name,
        email: req.user.email,
      },
    });

  } catch (err) {
    console.error('[payments/create-order]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── POST /payments/verify ─────────────────────────────────────────
// Called after successful Razorpay payment on the frontend.
// Verifies signature → creates the actual order in DB.
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, delivery_address, outlet_id }

router.post('/verify', requireAuth, async (req, res) => {
  const {
    razorpay_order_id, razorpay_payment_id, razorpay_signature,
    delivery_address, outlet_id,
  } = req.body;

  // ── Verify signature ──────────────────────────────────────────
  const body      = razorpay_order_id + '|' + razorpay_payment_id;
  const expected  = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expected !== razorpay_signature) {
    return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
  }

  // ── Signature valid — create order ────────────────────────────
  try {
    const order = await db.transaction(async (trx) => {
      const cart = await trx('carts').where({ user_id: req.user.id }).first();
      if (!cart) throw { status: 400, message: 'Cart not found.' };

      const items = await trx('cart_items as ci')
        .join('product_variants as v', 'v.id', 'ci.variant_id')
        .join('products as p', 'p.id', 'v.product_id')
        .where('ci.cart_id', cart.id)
        .select('ci.quantity','v.id as variant_id','v.name as variant_name',
                'v.price','v.stock','v.max_qty_per_order','p.name as product_name');

      if (!items.length) throw { status: 400, message: 'Cart is empty.' };

      // Re-validate
      for (const item of items) {
        if (item.quantity > item.max_qty_per_order)
          throw { status: 400, message: `Max qty exceeded for ${item.product_name}.` };
        if (item.quantity > item.stock)
          throw { status: 400, message: `Insufficient stock for ${item.product_name}.` };
      }

      const subtotal    = items.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);
      const deliveryFee = subtotal >= 499 ? 0 : 40;
      const total       = subtotal + deliveryFee;

      const [newOrder] = await trx('orders').insert({
        user_id:          req.user.id,
        outlet_id,
        status:           'confirmed',
        subtotal:         Math.round(subtotal * 100) / 100,
        delivery_fee:     deliveryFee,
        total:            Math.round(total * 100) / 100,
        delivery_address,
        eta_minutes:      30,
        payment_method:   'online',
        payment_id:       razorpay_payment_id,
        razorpay_order_id,
      }).returning('*');

      await trx('order_items').insert(items.map((i) => ({
        order_id:     newOrder.id,
        variant_id:   i.variant_id,
        variant_name: i.variant_name,
        product_name: i.product_name,
        price:        i.price,
        quantity:     i.quantity,
      })));

      for (const item of items) {
        await trx('product_variants').where({ id: item.variant_id }).decrement('stock', item.quantity);
      }

      await trx('cart_items').where({ cart_id: cart.id }).delete();

      return newOrder;
    });

    const fullOrder = await db('orders').where({ id: order.id }).first();
    const orderItems = await db('order_items').where({ order_id: order.id });
    return res.status(201).json({ order: { ...fullOrder, items: orderItems } });

  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('[payments/verify]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── POST /payments/webhook ────────────────────────────────────────
// Razorpay calls this directly (server-to-server).
// Handles edge cases like payment captured after timeout.

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const body      = req.body.toString();

  // Verify webhook signature
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (expected !== signature) {
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }

  const event = JSON.parse(body);

  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    console.log('[webhook] payment captured:', payment.id, '₹' + payment.amount / 100);
    // Order is already created in /verify — this is a safety net
  }

  return res.json({ received: true });
});

module.exports = router;
