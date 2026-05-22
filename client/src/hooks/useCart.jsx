/**
 * client/src/hooks/useCart.jsx
 * Global cart state with optimistic updates (Phase 11).
 * addItem updates UI instantly, syncs to server in background.
 */

import { useState, useCallback, createContext, useContext } from 'react';
import api from '../services/api/client';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState({ items: [], subtotal: 0, item_count: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetchCart = useCallback(async (token) => {
    if (!token) return;
    try {
      const data = await api.get('/cart', token);
      setCart(data);
    } catch {}
  }, []);

  // ── Optimistic add ────────────────────────────────────────────
  const addItem = useCallback(async (variantId, quantity = 1, token) => {
    setError(null);

    // Instant UI update
    setCart((prev) => {
      const existing = prev.items?.find((i) => i.variant_id === variantId);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.variant_id === variantId
              ? { ...i, quantity: i.quantity + quantity }
              : i
          ),
          item_count: (prev.item_count || 0) + quantity,
          subtotal: ((parseFloat(prev.subtotal) || 0) + parseFloat(existing.price || 0) * quantity).toFixed(2),
        };
      }
      return { ...prev, item_count: (prev.item_count || 0) + quantity };
    });

    // Sync to server
    try {
      const data = await api.post('/cart/add', { variant_id: variantId, quantity }, token);
      setCart(data);
      return { success: true };
    } catch (err) {
      // Revert
      setCart((prev) => ({ ...prev, item_count: Math.max(0, (prev.item_count || 0) - quantity) }));
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  const updateItem = useCallback(async (cartItemId, quantity, token) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.put('/cart/update', { cart_item_id: cartItemId, quantity }, token);
      setCart(data);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const removeItem = useCallback(async (cartItemId, token) => {
    return updateItem(cartItemId, 0, token);
  }, [updateItem]);

  const clearCart = useCallback(async (token) => {
    try {
      await api.delete('/cart', token);
      setCart({ items: [], subtotal: 0, item_count: 0 });
    } catch {}
  }, []);

  return (
    <CartContext.Provider value={{
      items:     cart.items     || [],
      subtotal:  cart.subtotal  || 0,
      itemCount: cart.item_count || 0,
      cartId:    cart.cart_id,
      loading,
      error,
      fetchCart,
      addItem,
      updateItem,
      removeItem,
      clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
