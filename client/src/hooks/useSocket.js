/**
 * client/src/hooks/useSocket.js
 * Phase 7 — Socket.io client hook
 *
 * Usage:
 *   const socket = useSocket();
 *   socket.emit('subscribe:order', orderId);
 *   socket.on('order:status', ({ orderId, status }) => { ... });
 */

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

let socketInstance = null;

export function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    // Reuse existing connection across components
    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        path: '/socket',
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socketInstance.on('connect', () => {
        console.log('[socket] connected:', socketInstance.id);
      });

      socketInstance.on('disconnect', () => {
        console.log('[socket] disconnected');
      });

      socketInstance.on('connect_error', (err) => {
        console.warn('[socket] connection error:', err.message);
      });
    }

    socketRef.current = socketInstance;

    return () => {
      // Don't disconnect on unmount — keep connection alive for other components
    };
  }, []);

  return socketRef.current;
}
