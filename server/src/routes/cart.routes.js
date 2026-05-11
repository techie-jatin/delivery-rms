/**
 * server/src/routes/cart.routes.js
 * Phase 1, Step 1.4 — Cart API with quantity enforcement
 *
 * GET    /api/v1/cart              — get current user's cart
 * POST   /api/v1/cart/add          — add item (enforces max_qty_per_order)
 * PUT    /api/v1/cart/update       — change quantity (enforces max_qty_per_order)
 * DELETE /api/v1/cart/item/:id     — remove one item
 * DELETE /api/v1/cart              — clear entire cart
 */

const express          = require('express');
const router           = express.Router();
const db               = require('../db');
const { requireAuth }  = require('../middleware/auth');

// All cart routes require login
router.use(requireAuth);

// ── Helper: get or create cart for user ───────────────────────────

async function getOrCreateCart(userId, trx = db) {
  let cart = await trx('carts').where({ user_id: userId }).first();
  if (!cart) {
    [cart] = await trx('carts').insert({ user_id: userId }).returning('*');
  }
  return cart;
}

// ── Helper: build full cart response ─────────────────────────────

async function buildCartResponse(userId) {
  const cart = await db('carts').where({ user_id: userId }).first();
  if (!cart) {
    return { cart: null, items: [], subtotal: 0, item_count: 0 };
  }

  const items = await db('cart_items as ci')
    .join('product_variants as v', 'v.id', 'ci.variant_id')
    .join('products as p', 'p.id', 'v.product_id')
    .where('ci.cart_id', cart.id)
    .select(
      'ci.id as cart_item_id',
      'ci.quantity',
      'v.id as variant_id',
      'v.name as variant_name',
      'v.sku',
      'v.price',
      'v.mrp',
      'v.stock',
      'v.max_qty_per_order',
      'v.unit',
      'v.image_url',
      'p.id as product_id',
      'p.name as product_name',
      'p.slug as product_slug'
    );

  const subtotal = items.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  return {
    cart_id:     cart.id,
    outlet_id:   cart.outlet_id,
    items,
    subtotal:    Math.round(subtotal * 100) / 100,
    item_count:  items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

// ── GET /cart ─────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const data = await buildCartResponse(req.user.id);
    return res.json(data);
  } catch (err) {
    console.error('[cart/get]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── POST /cart/add ────────────────────────────────────────────────
// Body: { variant_id, quantity }

router.post('/add', async (req, res) => {
  const { variant_id, quantity = 1 } = req.body;

  if (!variant_id) {
    return res.status(400).json({ error: 'variant_id is required.' });
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ error: 'quantity must be a positive integer.' });
  }

  try {
    // ── 1. Check variant exists and is active ─────────────────────
    const variant = await db('product_variants')
      .where({ id: variant_id, is_active: true })
      .first();

    if (!variant) {
      return res.status(404).json({ error: 'Product variant not found.' });
    }

    // ── 2. Check stock ────────────────────────────────────────────
    if (variant.stock < quantity) {
      return res.status(400).json({
        error: `Only ${variant.stock} units in stock.`,
      });
    }

    const result = await db.transaction(async (trx) => {
      const cart = await getOrCreateCart(req.user.id, trx);

      // ── 3. Check if already in cart ───────────────────────────
      const existing = await trx('cart_items')
        .where({ cart_id: cart.id, variant_id })
        .first();

      const newQty = existing ? existing.quantity + quantity : quantity;

      // ── 4. ENFORCE max_qty_per_order ──────────────────────────
      // This is the critical check — backend always validates,
      // regardless of what the frontend sent.
      if (newQty > variant.max_qty_per_order) {
        throw {
          status: 400,
          message: `Maximum ${variant.max_qty_per_order} unit${variant.max_qty_per_order === 1 ? '' : 's'} allowed per order for this item.`,
        };
      }

      // ── 5. Insert or update cart item ─────────────────────────
      if (existing) {
        await trx('cart_items')
          .where({ id: existing.id })
          .update({ quantity: newQty, updated_at: trx.fn.now() });
      } else {
        await trx('cart_items').insert({
          cart_id:    cart.id,
          variant_id,
          quantity,
        });
      }

      return cart;
    });

    const data = await buildCartResponse(req.user.id);
    return res.status(200).json(data);

  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('[cart/add]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── PUT /cart/update ──────────────────────────────────────────────
// Body: { cart_item_id, quantity }
// Set quantity directly (not increment). Use 0 to remove.

router.put('/update', async (req, res) => {
  const { cart_item_id, quantity } = req.body;

  if (!cart_item_id || quantity == null) {
    return res.status(400).json({ error: 'cart_item_id and quantity are required.' });
  }
  if (!Number.isInteger(quantity) || quantity < 0) {
    return res.status(400).json({ error: 'quantity must be 0 or a positive integer.' });
  }

  try {
    // Verify cart item belongs to this user
    const item = await db('cart_items as ci')
      .join('carts as c', 'c.id', 'ci.cart_id')
      .join('product_variants as v', 'v.id', 'ci.variant_id')
      .where('ci.id', cart_item_id)
      .where('c.user_id', req.user.id)
      .select('ci.*', 'v.max_qty_per_order', 'v.stock')
      .first();

    if (!item) {
      return res.status(404).json({ error: 'Cart item not found.' });
    }

    // quantity 0 = remove item
    if (quantity === 0) {
      await db('cart_items').where({ id: cart_item_id }).delete();
      const data = await buildCartResponse(req.user.id);
      return res.json(data);
    }

    // Enforce max_qty_per_order
    if (quantity > item.max_qty_per_order) {
      return res.status(400).json({
        error: `Maximum ${item.max_qty_per_order} unit${item.max_qty_per_order === 1 ? '' : 's'} allowed per order for this item.`,
      });
    }

    // Enforce stock
    if (quantity > item.stock) {
      return res.status(400).json({
        error: `Only ${item.stock} units in stock.`,
      });
    }

    await db('cart_items')
      .where({ id: cart_item_id })
      .update({ quantity, updated_at: db.fn.now() });

    const data = await buildCartResponse(req.user.id);
    return res.json(data);

  } catch (err) {
    console.error('[cart/update]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── DELETE /cart/item/:id ─────────────────────────────────────────

router.delete('/item/:id', async (req, res) => {
  try {
    const item = await db('cart_items as ci')
      .join('carts as c', 'c.id', 'ci.cart_id')
      .where('ci.id', req.params.id)
      .where('c.user_id', req.user.id)
      .select('ci.id')
      .first();

    if (!item) {
      return res.status(404).json({ error: 'Cart item not found.' });
    }

    await db('cart_items').where({ id: req.params.id }).delete();

    const data = await buildCartResponse(req.user.id);
    return res.json(data);

  } catch (err) {
    console.error('[cart/delete-item]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── DELETE /cart ──────────────────────────────────────────────────
// Clear entire cart

router.delete('/', async (req, res) => {
  try {
    const cart = await db('carts').where({ user_id: req.user.id }).first();
    if (cart) {
      await db('cart_items').where({ cart_id: cart.id }).delete();
    }
    return res.json({ message: 'Cart cleared.', items: [], subtotal: 0, item_count: 0 });
  } catch (err) {
    console.error('[cart/clear]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
