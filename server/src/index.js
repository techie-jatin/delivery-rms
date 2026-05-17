/**
 * server/src/index.js
 * Express app entry point with Socket.io.
 */

require('dotenv').config();
const http    = require('http');
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const app    = express();
const server = http.createServer(app); // wrap express in http server for socket.io

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/v1/auth',     require('./routes/auth.routes'));
app.use('/api/v1/products', require('./routes/product.routes'));
app.use('/api/v1/cart',     require('./routes/cart.routes'));
app.use('/api/v1/orders',   require('./routes/order.routes'));
app.use('/api/v1/outlets',  require('./routes/outlet.routes'));
app.use('/api/v1/delivery', require('./routes/delivery.routes'));
app.use('/api/v1/banners',  require('./routes/banner.routes'));
app.use('/api/v1/payments', require('./routes/payment.routes'));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Socket.io ─────────────────────────────────────────────────────
const { initSocket } = require('./socket');
initSocket(server);

// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`API + Socket.io running on http://localhost:${PORT}`));
