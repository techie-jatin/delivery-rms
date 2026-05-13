/**
 * server/src/routes/banner.routes.js
 * GET  /api/v1/banners          — public, returns currently active banners
 * POST /api/v1/banners          — admin, create banner
 * PUT  /api/v1/banners/:id      — admin, update
 * DELETE /api/v1/banners/:id    — admin, delete
 */

const express          = require('express');
const router           = express.Router();
const db               = require('../db');
const { requireAdmin } = require('../middleware/auth');

// ── GET /banners — public ─────────────────────────────────────────
// Returns banners where now is between starts_at and ends_at

router.get('/', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const banners = await db('banners')
      .where('is_active', true)
      .where('starts_at', '<=', now)
      .where('ends_at',   '>=', now)
      .orderBy('sort_order', 'asc')
      .select('*');
    return res.json({ banners });
  } catch (err) {
    console.error('[banners/list]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── GET /banners/all — admin: all banners including expired ───────
router.get('/all', requireAdmin, async (req, res) => {
  try {
    const banners = await db('banners').orderBy('starts_at', 'desc');
    return res.json({ banners });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── POST /banners ─────────────────────────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  const { title, subtitle, cta_label, cta_link, bg_color, text_color, emoji, starts_at, ends_at, sort_order } = req.body;
  if (!title || !starts_at || !ends_at) {
    return res.status(400).json({ error: 'title, starts_at and ends_at are required.' });
  }
  try {
    const [banner] = await db('banners').insert({
      title, subtitle, cta_label, cta_link,
      bg_color:   bg_color   || '#00e5a0',
      text_color: text_color || '#0a0a0f',
      emoji, starts_at, ends_at,
      sort_order: sort_order || 0,
    }).returning('*');
    return res.status(201).json({ banner });
  } catch (err) {
    console.error('[banners/create]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── PUT /banners/:id ──────────────────────────────────────────────
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const [updated] = await db('banners')
      .where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() })
      .returning('*');
    if (!updated) return res.status(404).json({ error: 'Banner not found.' });
    return res.json({ banner: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── DELETE /banners/:id ───────────────────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db('banners').where({ id: req.params.id }).delete();
    return res.json({ message: 'Banner deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
