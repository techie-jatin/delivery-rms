/**
 * server/src/routes/seller.routes.js
 * Phase 9 — Seller onboarding
 *
 * POST /api/v1/sellers/register          — seller registers shop (auth required)
 * GET  /api/v1/sellers/me                — get own seller profile
 * PUT  /api/v1/sellers/me                — update own shop details
 * GET  /api/v1/sellers                   — admin: list all sellers
 * PUT  /api/v1/sellers/:id/approve       — admin: approve seller
 * PUT  /api/v1/sellers/:id/reject        — admin: reject seller
 * GET  /api/v1/sellers/:id/products      — seller's products (public)
 */

const express            = require('express');
const router             = express.Router();
const db                 = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

function requireSeller(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'seller' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Seller access required.' });
    }
    next();
  });
}

// ── POST /sellers/register ────────────────────────────────────────
// Any logged-in user can apply to become a seller.
// Body: { shop_name, shop_description, address, phone, gstin }

router.post('/register', requireAuth, async (req, res) => {
  const { shop_name, shop_description, address, phone, gstin } = req.body;

  if (!shop_name || !address || !phone) {
    return res.status(400).json({ error: 'shop_name, address and phone are required.' });
  }

  try {
    // Check if already registered
    const existing = await db('sellers').where({ user_id: req.user.id }).first();
    if (existing) {
      return res.status(409).json({ error: 'You already have a seller application.', seller: existing });
    }

    const shop_slug = shop_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const [seller] = await db.transaction(async (trx) => {
      // Create seller record
      const [s] = await trx('sellers').insert({
        user_id: req.user.id,
        shop_name,
        shop_slug,
        shop_description,
        address,
        phone,
        gstin: gstin || null,
        status: 'pending',
        is_active: false,
      }).returning('*');

      // Update user role to seller
      await trx('users').where({ id: req.user.id }).update({ role: 'seller' });

      return [s];
    });

    return res.status(201).json({
      seller,
      message: 'Application submitted. Admin will review and approve your shop.',
    });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Shop name already taken. Try a different name.' });
    }
    console.error('[sellers/register]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── GET /sellers/me ───────────────────────────────────────────────

router.get('/me', requireSeller, async (req, res) => {
  try {
    const seller = await db('sellers').where({ user_id: req.user.id }).first();
    if (!seller) return res.status(404).json({ error: 'Seller profile not found.' });
    return res.json({ seller });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── PUT /sellers/me ───────────────────────────────────────────────

router.put('/me', requireSeller, async (req, res) => {
  const { shop_name, shop_description, address, phone, gstin } = req.body;
  try {
    const [updated] = await db('sellers')
      .where({ user_id: req.user.id })
      .update({
        ...(shop_name        != null && { shop_name }),
        ...(shop_description != null && { shop_description }),
        ...(address          != null && { address }),
        ...(phone            != null && { phone }),
        ...(gstin            != null && { gstin }),
        updated_at: db.fn.now(),
      })
      .returning('*');
    return res.json({ seller: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── GET /sellers — admin: all sellers ────────────────────────────

router.get('/', requireAdmin, async (req, res) => {
  try {
    const sellers = await db('sellers as s')
      .join('users as u', 'u.id', 's.user_id')
      .select('s.*', 'u.name as owner_name', 'u.email as owner_email')
      .orderBy('s.created_at', 'desc');
    return res.json({ sellers });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── PUT /sellers/:id/approve — admin ─────────────────────────────

router.put('/:id/approve', requireAdmin, async (req, res) => {
  try {
    const [seller] = await db('sellers')
      .where({ id: req.params.id })
      .update({ status: 'approved', is_active: true, updated_at: db.fn.now() })
      .returning('*');

    if (!seller) return res.status(404).json({ error: 'Seller not found.' });

    return res.json({ seller, message: 'Seller approved.' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── PUT /sellers/:id/reject — admin ──────────────────────────────

router.put('/:id/reject', requireAdmin, async (req, res) => {
  const { reason } = req.body;
  try {
    const [seller] = await db('sellers')
      .where({ id: req.params.id })
      .update({
        status: 'rejected',
        is_active: false,
        rejection_reason: reason || 'Application did not meet requirements.',
        updated_at: db.fn.now(),
      })
      .returning('*');

    if (!seller) return res.status(404).json({ error: 'Seller not found.' });

    return res.json({ seller, message: 'Seller rejected.' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── GET /sellers/:id/products — public ───────────────────────────

router.get('/:id/products', async (req, res) => {
  try {
    const seller = await db('sellers').where({ id: req.params.id, is_active: true }).first();
    if (!seller) return res.status(404).json({ error: 'Seller not found.' });

    const products = await db('products as p')
      .join('product_categories as c', 'c.id', 'p.category_id')
      .where({ 'p.seller_id': req.params.id, 'p.is_active': true })
      .select('p.*', 'c.name as category_name', 'c.slug as category_slug');

    const ids = products.map((p) => p.id);
    const variants = ids.length
      ? await db('product_variants').whereIn('product_id', ids).where('is_active', true).orderBy('price', 'asc')
      : [];

    const byProduct = {};
    for (const v of variants) {
      if (!byProduct[v.product_id]) byProduct[v.product_id] = [];
      byProduct[v.product_id].push(v);
    }

    return res.json({
      seller,
      products: products.map((p) => ({ ...p, variants: byProduct[p.id] || [] })),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
