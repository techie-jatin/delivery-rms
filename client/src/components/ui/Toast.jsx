/**
 * client/src/components/ui/Toast.jsx
 * Phase 11 — Toast notifications
 *
 * Usage:
 *   import { useToast, ToastContainer } from './Toast.jsx';
 *
 *   // In App.jsx, add <ToastContainer /> once
 *   // In any component:
 *   const toast = useToast();
 *   toast.success('Added to cart ✓');
 *   toast.error('Max quantity reached');
 */

import { useState, useCallback, createContext, useContext, useEffect } from 'react';
import './Toast.css';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = 'success', duration = 2500) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const toast = {
    success: (msg) => add(msg, 'success'),
    error:   (msg) => add(msg, 'error'),
    info:    (msg) => add(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            {t.type === 'success' && <span className="toast__icon">✓</span>}
            {t.type === 'error'   && <span className="toast__icon">✕</span>}
            {t.type === 'info'    && <span className="toast__icon">ℹ</span>}
            <span className="toast__msg">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
