/**
 * server/src/routes/order.routes.js
 * Phase 1, Step 1.5 — Order placement API
 *
 * POST /api/v1/orders              — place order from cart
 * GET  /api/v1/orders              — list current user's orders
 * GET  /api/v1/orders/:id          — single order with items
 * PUT  /api/v1/orders/:id/status   — admin: update order status
 */

const express            = require('express');
const router             = express.Router();
const db                 = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ── POST /orders ──────────────────────────────────────────────────
// Places an order from the user's current cart.
// Body: { delivery_address, delivery_lat, delivery_lng, outlet_id }
//
// Flow inside a single transaction:
//   1. Load cart + items
//   2. Re-validate qty limits + stock for every item
//   3. Create order + order_items (price snapshot)
//   4. Decrement stock for each variant
//   5. Clear cart
//   6. Return created order

router.post('/', requireAuth, async (req, res) => {
  const { delivery_address, delivery_lat, delivery_lng, outlet_id } = req.body;

  if (!delivery_address || !outlet_id) {
    return res.status(400).json({ error: 'delivery_address and outlet_id are required.' });
  }

  try {
    const order = await db.transaction(async (trx) => {

      // ── 1. Load cart ────────────────────────────────────────────
      const cart = await trx('carts').where({ user_id: req.user.id }).first();
      if (!cart) {
        throw { status: 400, message: 'Your cart is empty.' };
      }

      const items = await trx('cart_items as ci')
        .join('product_variants as v', 'v.id', 'ci.variant_id')
        .join('products as p', 'p.id', 'v.product_id')
        .where('ci.cart_id', cart.id)
        .select(
          'ci.id as cart_item_id',
          'ci.quantity',
          'v.id as variant_id',
          'v.name as variant_name',
          'v.price',
          'v.stock',
          'v.max_qty_per_order',
          'p.name as product_name'
        );

      if (!items.length) {
        throw { status: 400, message: 'Your cart is empty.' };
      }

      // ── 2. Re-validate every item ───────────────────────────────
      // Backend always re-checks — never trust what was in the cart
      for (const item of items) {
        if (item.quantity > item.max_qty_per_order) {
          throw {
            status: 400,
            message: `Maximum ${item.max_qty_per_order} units allowed for ${item.product_name}.`,
          };
        }
        if (item.quantity > item.stock) {
          throw {
            status: 400,
            message: `Not enough stock for ${item.product_name}. Only ${item.stock} left.`,
          };
        }
      }

      // ── 3. Calculate totals ─────────────────────────────────────
      const subtotal = items.reduce(
        (sum, item) => sum + parseFloat(item.price) * item.quantity,
        0
      );

      // Simple delivery fee — will be replaced by geo-based fee in Phase 2
      const deliveryFee = subtotal >= 499 ? 0 : 40;
      const total = subtotal + deliveryFee;

      // ── 4. Create order ─────────────────────────────────────────
      const [newOrder] = await trx('orders').insert({
        user_id:          req.user.id,
        outlet_id,
        status:           'confirmed',
        subtotal:         Math.round(subtotal * 100) / 100,
        delivery_fee:     deliveryFee,
        total:            Math.round(total * 100) / 100,
        delivery_address,
        delivery_lat:     delivery_lat || null,
        delivery_lng:     delivery_lng || null,
        eta_minutes:      30, // static for now — Phase 2 makes this dynamic
      }).returning('*');

      // ── 5. Create order items (price snapshot) ──────────────────
      // We snapshot the price at time of order — if price changes later,
      // old orders still show the correct price paid.
      const orderItems = items.map((item) => ({
        order_id:     newOrder.id,
        variant_id:   item.variant_id,
        variant_name: item.variant_name,
        product_name: item.product_name,
        price:        item.price,
        quantity:     item.quantity,
      }));

      await trx('order_items').insert(orderItems);

      // ── 6. Decrement stock atomically ───────────────────────────
      for (const item of items) {
        await trx('product_variants')
          .where({ id: item.variant_id })
          .decrement('stock', item.quantity);
      }

      // ── 7. Clear cart ───────────────────────────────────────────
      await trx('cart_items').where({ cart_id: cart.id }).delete();

      return newOrder;
    });

    // Return order with items
    const fullOrder = await getOrderWithItems(order.id, req.user.id);
    return res.status(201).json({ order: fullOrder });

  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('[orders/create]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── GET /orders ───────────────────────────────────────────────────
// List all orders for current user, newest first.

router.get('/', requireAuth, async (req, res) => {
  try {
    const orders = await db('orders')
      .where(req.user.role === 'admin' ? {} : { user_id: req.user.id })
      .orderBy('created_at', 'desc')
      .select('*');

    // Attach items to each order (needed for reorder feature)
    const orderIds = orders.map((o) => o.id);
    const allItems = orderIds.length
      ? await db('order_items').whereIn('order_id', orderIds)
      : [];

    const itemsByOrder = {};
    for (const item of allItems) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    }

    const ordersWithItems = orders.map((o) => ({
      ...o,
      items: itemsByOrder[o.id] || [],
    }));

    return res.json({ orders: ordersWithItems });
  } catch (err) {
    console.error('[orders/list]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── GET /orders/:id ───────────────────────────────────────────────

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const order = await getOrderWithItems(req.params.id, req.user.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    return res.json({ order });
  } catch (err) {
    console.error('[orders/get]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── PUT /orders/:id/status ────────────────────────────────────────
// Admin only. Valid transitions:
// confirmed → preparing → out_for_delivery → delivered
// any → cancelled

router.put('/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const updates = { status, updated_at: db.fn.now() };
    if (status === 'delivered') updates.delivered_at = db.fn.now();

    // If cancelling, restock items
    if (status === 'cancelled') {
      const order = await db('orders').where({ id: req.params.id }).first();
      if (order && order.status !== 'cancelled') {
        const items = await db('order_items').where({ order_id: order.id });
        for (const item of items) {
          await db('product_variants')
            .where({ id: item.variant_id })
            .increment('stock', item.quantity);
        }
      }
    }

    const [updated] = await db('orders')
      .where({ id: req.params.id })
      .update(updates)
      .returning('*');

    if (!updated) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    return res.json({ order: updated });
  } catch (err) {
    console.error('[orders/status]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── Helper ────────────────────────────────────────────────────────

async function getOrderWithItems(orderId, userId) {
  const order = await db('orders')
    .where({ id: orderId, user_id: userId })
    .first();
  if (!order) return null;

  const items = await db('order_items').where({ order_id: order.id });
  return { ...order, items };
}

module.exports = router;
