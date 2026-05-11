/**
 * server/src/routes/product.routes.js
 * Phase 1, Step 1.3 — Product catalog API
 *
 * GET    /api/v1/products              — public, list all active products
 * GET    /api/v1/products/:id          — public, single product + variants
 * POST   /api/v1/products              — admin only, create product + variants
 * PUT    /api/v1/products/:id          — admin only, update product
 * DELETE /api/v1/products/:id          — admin only, soft delete (is_active=false)
 */

const express          = require('express');
const router           = express.Router();
const db               = require('../db');
const { requireAdmin } = require('../middleware/auth');

// ── GET /products ─────────────────────────────────────────────────
// Public. Returns all active products with their variants.
// Optional query params: ?category=slug

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;

    let query = db('products as p')
      .join('product_categories as c', 'c.id', 'p.category_id')
      .where('p.is_active', true)
      .select(
        'p.id', 'p.name', 'p.slug', 'p.brand',
        'p.description', 'p.image_url',
        'c.id as category_id', 'c.name as category_name', 'c.slug as category_slug'
      )
      .orderBy('p.name');

    if (category) {
      query = query.where('c.slug', category);
    }

    const products = await query;

    // Attach variants to each product
    const ids = products.map((p) => p.id);
    const variants = ids.length
      ? await db('product_variants').whereIn('product_id', ids).where('is_active', true)
      : [];

    const variantsByProduct = {};
    for (const v of variants) {
      if (!variantsByProduct[v.product_id]) variantsByProduct[v.product_id] = [];
      variantsByProduct[v.product_id].push(v);
    }

    const result = products.map((p) => ({
      ...p,
      variants: variantsByProduct[p.id] || [],
    }));

    return res.json({ products: result });

  } catch (err) {
    console.error('[products/list]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── GET /products/:id ─────────────────────────────────────────────
// Public. Single product with all its variants.

router.get('/:id', async (req, res) => {
  try {
    const product = await db('products as p')
      .join('product_categories as c', 'c.id', 'p.category_id')
      .where('p.id', req.params.id)
      .where('p.is_active', true)
      .select(
        'p.id', 'p.name', 'p.slug', 'p.brand',
        'p.description', 'p.image_url',
        'c.id as category_id', 'c.name as category_name', 'c.slug as category_slug'
      )
      .first();

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const variants = await db('product_variants')
      .where({ product_id: product.id, is_active: true });

    return res.json({ product: { ...product, variants } });

  } catch (err) {
    console.error('[products/get]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── POST /products ────────────────────────────────────────────────
// Admin only. Creates a product and its variants in one request.
//
// Body:
// {
//   name, slug, brand, description, image_url, category_id,
//   variants: [
//     { name, sku, price, mrp, stock, max_qty_per_order, unit }
//   ]
// }

router.post('/', requireAdmin, async (req, res) => {
  const { name, slug, brand, description, image_url, category_id, variants } = req.body;

  if (!name || !slug || !category_id) {
    return res.status(400).json({ error: 'name, slug and category_id are required.' });
  }
  if (!variants || !variants.length) {
    return res.status(400).json({ error: 'At least one variant is required.' });
  }

  // Validate each variant has required fields
  for (const v of variants) {
    if (!v.name || !v.sku || v.price == null) {
      return res.status(400).json({ error: 'Each variant needs name, sku and price.' });
    }
  }

  try {
    // Use a transaction — if variants fail, product is rolled back too
    const result = await db.transaction(async (trx) => {
      const [product] = await trx('products')
        .insert({ name, slug, brand, description, image_url, category_id })
        .returning('*');

      const variantRows = variants.map((v) => ({
        product_id:        product.id,
        name:              v.name,
        sku:               v.sku,
        price:             v.price,
        mrp:               v.mrp || null,
        stock:             v.stock || 0,
        max_qty_per_order: v.max_qty_per_order || 10,
        unit:              v.unit || null,
        image_url:         v.image_url || null,
      }));

      const insertedVariants = await trx('product_variants')
        .insert(variantRows)
        .returning('*');

      return { ...product, variants: insertedVariants };
    });

    return res.status(201).json({ product: result });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A product or variant with this slug/SKU already exists.' });
    }
    console.error('[products/create]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── PUT /products/:id ─────────────────────────────────────────────
// Admin only. Update product fields (not variants — update variants separately).

router.put('/:id', requireAdmin, async (req, res) => {
  const { name, slug, brand, description, image_url, category_id } = req.body;

  try {
    const [updated] = await db('products')
      .where({ id: req.params.id })
      .update({ name, slug, brand, description, image_url, category_id, updated_at: db.fn.now() })
      .returning('*');

    if (!updated) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    return res.json({ product: updated });

  } catch (err) {
    console.error('[products/update]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── DELETE /products/:id ──────────────────────────────────────────
// Admin only. Soft delete — sets is_active=false. Data is preserved.

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const [updated] = await db('products')
      .where({ id: req.params.id })
      .update({ is_active: false, updated_at: db.fn.now() })
      .returning('id');

    if (!updated) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    return res.json({ message: 'Product deactivated.' });

  } catch (err) {
    console.error('[products/delete]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
