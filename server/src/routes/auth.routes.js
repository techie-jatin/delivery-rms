/**
 * server/src/routes/auth.routes.js
 * Phase 1, Step 1.2 — Auth system
 *
 * POST /api/v1/auth/register
 * POST /api/v1/auth/login
 * GET  /api/v1/auth/me  (protected)
 */

const express        = require('express');
const router         = express.Router();
const bcrypt         = require('bcryptjs');
const jwt            = require('jsonwebtoken');
const db             = require('../db');
const { requireAuth } = require('../middleware/auth');

// ── Helpers ───────────────────────────────────────────────────────

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d' }
  );
}

function safeUser(user) {
  // Never send password_hash to the client
  const { password_hash, ...safe } = user;
  return safe;
}

// ── POST /register ────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  const { name, email, password, phone } = req.body;

  // Basic validation
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    // Check duplicate email
    const existing = await db('users').where({ email }).first();
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [user] = await db('users')
      .insert({ name, email, phone: phone || null, password_hash, role: 'customer' })
      .returning('*');

    const token = signToken(user);

    return res.status(201).json({ token, user: safeUser(user) });

  } catch (err) {
    console.error('[auth/register]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── POST /login ───────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  try {
    const user = await db('users').where({ email }).first();

    // Same error for wrong email OR wrong password — don't reveal which
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is disabled.' });
    }

    const token = signToken(user);

    return res.json({ token, user: safeUser(user) });

  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── GET /me (protected) ───────────────────────────────────────────

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await db('users').where({ id: req.user.id }).first();
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json({ user: safeUser(user) });
  } catch (err) {
    console.error('[auth/me]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;