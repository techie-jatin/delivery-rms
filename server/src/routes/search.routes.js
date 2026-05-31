/**
 * server/src/routes/search.routes.js
 * GET  /api/v1/search?q=horlicks  — search products
 * POST /api/v1/search/sync        — admin: sync to Meilisearch
 */

const express          = require('express');
const router           = express.Router();
const db               = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { syncProducts, searchProducts } = require('../services/search');

router.get('/', async (req, res) => {
  const { q, limit = 20 } = req.query;
  if (!q || !q.trim()) return res.json({ hits: [], estimatedTotalHits: 0 });
  try {
    const results = await searchProducts(q.trim(), { limit: parseInt(limit) });
    return res.json(results);
  } catch (err) {
    return res.status(500).json({ error: 'Search unavailable.' });
  }
});

router.post('/sync', requireAdmin, async (req, res) => {
  try {
    const count = await syncProducts(db);
    return res.json({ message: `Synced ${count} products.` });
  } catch (err) {
    return res.status(500).json({ error: 'Sync failed: ' + err.message });
  }
});

module.exports = router;
