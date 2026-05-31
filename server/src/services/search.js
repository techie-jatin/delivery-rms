/**
 * server/src/services/search.js
 * Phase 12 — Meilisearch integration
 */

const { MeiliSearch } = require('meilisearch');

const client = new MeiliSearch({
  host:   process.env.MEILI_URL        || 'http://localhost:7700',
  apiKey: process.env.MEILI_MASTER_KEY || '',
});

const INDEX_NAME = 'products';

async function setupIndex() {
  try {
    const index = client.index(INDEX_NAME);
    await index.updateSettings({
      searchableAttributes: ['name', 'brand', 'description', 'category_name', 'variant_names'],
      filterableAttributes: ['category_slug', 'is_active'],
      sortableAttributes:   ['price_min', 'name'],
    });
    console.log('[search] Index settings updated');
  } catch (err) {
    console.warn('[search] Could not setup index:', err.message);
  }
}

async function syncProducts(db) {
  try {
    const products = await db('products as p')
      .join('product_categories as c', 'c.id', 'p.category_id')
      .where('p.is_active', true)
      .select('p.id','p.name','p.slug','p.brand','p.description','p.image_url',
              'c.name as category_name','c.slug as category_slug');

    const ids = products.map((p) => p.id);
    const variants = ids.length
      ? await db('product_variants').whereIn('product_id', ids).where('is_active', true)
      : [];

    const byProduct = {};
    for (const v of variants) {
      if (!byProduct[v.product_id]) byProduct[v.product_id] = [];
      byProduct[v.product_id].push(v);
    }

    const documents = products.map((p) => {
      const pvariants = byProduct[p.id] || [];
      const prices = pvariants.map((v) => parseFloat(v.price));
      return {
        id:            p.id,
        name:          p.name,
        slug:          p.slug,
        brand:         p.brand || '',
        description:   p.description || '',
        image_url:     p.image_url || null,
        category_name: p.category_name,
        category_slug: p.category_slug,
        is_active:     true,
        variant_names: pvariants.map((v) => v.name).join(' '),
        price_min:     prices.length ? Math.min(...prices) : 0,
        price_max:     prices.length ? Math.max(...prices) : 0,
        variants:      pvariants.map((v) => ({
          id: v.id, name: v.name, sku: v.sku,
          price: parseFloat(v.price),
          mrp: v.mrp ? parseFloat(v.mrp) : null,
          stock: v.stock, max_qty_per_order: v.max_qty_per_order, unit: v.unit,
        })),
      };
    });

    const index = client.index(INDEX_NAME);
    await index.addDocuments(documents);
    console.log(`[search] Synced ${documents.length} products`);
    return documents.length;
  } catch (err) {
    console.error('[search] Sync failed:', err.message);
    throw err;
  }
}

async function searchProducts(query, options = {}) {
  try {
    const index = client.index(INDEX_NAME);
    return await index.search(query, {
      limit:  options.limit  || 20,
      filter: 'is_active = true',
      ...options,
    });
  } catch (err) {
    console.error('[search] Search failed:', err.message);
    return { hits: [], estimatedTotalHits: 0 };
  }
}

module.exports = { setupIndex, syncProducts, searchProducts, client };
