/**
 * server/src/routes/product.routes.js
 * Phase 1.3 + 4.2 — Product catalog API
 */

const express          = require('express');
const router           = express.Router();
const db               = require('../db');
const { requireAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = db('products as p')
      .join('product_categories as c', 'c.id', 'p.category_id')
      .where('p.is_active', true)
      .select('p.id','p.name','p.slug','p.brand','p.description','p.image_url',
              'c.id as category_id','c.name as category_name','c.slug as category_slug')
      .orderBy('p.name');
    if (category) query = query.where('c.slug', category);
    const products = await query;
    const ids = products.map((p) => p.id);
    const variants = ids.length ? await db('product_variants').whereIn('product_id', ids).where('is_active', true).orderBy('price', 'asc') : [];
    const byProduct = {};
    for (const v of variants) {
      if (!byProduct[v.product_id]) byProduct[v.product_id] = [];
      byProduct[v.product_id].push(v);
    }
    return res.json({ products: products.map((p) => ({ ...p, variants: byProduct[p.id] || [] })) });
  } catch (err) { console.error('[products/list]', err); return res.status(500).json({ error: 'Internal server error.' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await db('products as p').join('product_categories as c','c.id','p.category_id')
      .where('p.id', req.params.id).where('p.is_active', true)
      .select('p.id','p.name','p.slug','p.brand','p.description','p.image_url',
              'c.id as category_id','c.name as category_name','c.slug as category_slug').first();
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    const variants = await db('product_variants').where({ product_id: product.id, is_active: true });
    return res.json({ product: { ...product, variants } });
  } catch (err) { return res.status(500).json({ error: 'Internal server error.' }); }
});

router.post('/', requireAdmin, async (req, res) => {
  const { name, slug, brand, description, image_url, category_id, variants } = req.body;
  if (!name || !slug || !category_id) return res.status(400).json({ error: 'name, slug and category_id are required.' });
  if (!variants || !variants.length) return res.status(400).json({ error: 'At least one variant is required.' });
  for (const v of variants) {
    if (!v.name || !v.sku || v.price == null) return res.status(400).json({ error: 'Each variant needs name, sku and price.' });
  }
  try {
    const result = await db.transaction(async (trx) => {
      const [product] = await trx('products').insert({ name, slug, brand, description, image_url, category_id }).returning('*');
      const variantRows = variants.map((v) => ({
        product_id: product.id, name: v.name, sku: v.sku, price: v.price,
        mrp: v.mrp || null, stock: v.stock || 0, max_qty_per_order: v.max_qty_per_order || 10,
        unit: v.unit || null, image_url: v.image_url || null,
      }));
      const insertedVariants = await trx('product_variants').insert(variantRows).returning('*');
      return { ...product, variants: insertedVariants };
    });
    return res.status(201).json({ product: result });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A product or variant with this slug/SKU already exists.' });
    console.error('[products/create]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { name, slug, brand, description, image_url, category_id, variants } = req.body;
  try {
    const result = await db.transaction(async (trx) => {
      const [updated] = await trx('products').where({ id: req.params.id }).update({
        ...(name        != null && { name }),
        ...(slug        != null && { slug }),
        ...(brand       != null && { brand }),
        ...(description != null && { description }),
        ...(image_url   != null && { image_url }),
        ...(category_id != null && { category_id }),
        updated_at: trx.fn.now(),
      }).returning('*');

      if (!updated) throw { status: 404, message: 'Product not found.' };

      if (variants && variants.length) {
        for (const v of variants) {
          // Find existing by id OR by sku — handles case where frontend didn't send id
          const existing = v.id
            ? await trx('product_variants').where({ id: v.id }).first()
            : await trx('product_variants').where({ sku: v.sku, product_id: updated.id }).first();

          const variantData = {
            name:              v.name,
            sku:               v.sku,
            price:             v.price,
            mrp:               v.mrp || null,
            stock:             v.stock || 0,
            max_qty_per_order: v.max_qty_per_order || 10,
            unit:              v.unit || null,
            updated_at:        trx.fn.now(),
          };

          if (existing) {
            await trx('product_variants').where({ id: existing.id }).update(variantData);
          } else {
            await trx('product_variants').insert({ product_id: updated.id, ...variantData });
          }
        }
      }

      const updatedVariants = await trx('product_variants').where({ product_id: updated.id, is_active: true });
      return { ...updated, variants: updatedVariants };
    });
    return res.json({ product: result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('[products/update]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const [updated] = await db('products').where({ id: req.params.id })
      .update({ is_active: false, updated_at: db.fn.now() }).returning('id');
    if (!updated) return res.status(404).json({ error: 'Product not found.' });
    return res.json({ message: 'Product deactivated.' });
  } catch (err) { return res.status(500).json({ error: 'Internal server error.' }); }
});

module.exports = router;
