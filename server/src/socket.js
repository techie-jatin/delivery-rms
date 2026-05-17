/**
 * server/src/socket.js
 * Phase 7 — Socket.io real-time order tracking
 *
 * Usage:
 *   const { initSocket, getIO } = require('./socket');
 *   initSocket(httpServer);  // call once in index.js
 *   getIO().to(`order:${id}`).emit('order:status', data);  // call from routes
 */

let io = null;

function initSocket(httpServer) {
  const { Server } = require('socket.io');

  io = new Server(httpServer, {
    path: '/socket',
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log('[socket] client connected:', socket.id);

    // Customer subscribes to their order updates
    socket.on('subscribe:order', (orderId) => {
      socket.join(`order:${orderId}`);
      console.log(`[socket] ${socket.id} subscribed to order:${orderId}`);
    });

    // Customer subscribes to all their orders (for orders list page)
    socket.on('subscribe:user', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`[socket] ${socket.id} subscribed to user:${userId}`);
    });

    socket.on('disconnect', () => {
      console.log('[socket] client disconnected:', socket.id);
    });
  });

  console.log('[socket] Socket.io initialized');
  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized. Call initSocket() first.');
  return io;
}

module.exports = { initSocket, getIO };
