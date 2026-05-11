/**
 * client/src/hooks/useCart.js
 * Global cart state.
 *
 * Usage:
 *   const { items, itemCount, subtotal, addItem, updateItem, removeItem, clearCart } = useCart();
 */

import { useState, useCallback, createContext, useContext } from 'react';
import api from '../services/api/client';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState({ items: [], subtotal: 0, item_count: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // Fetch cart from backend
  const fetchCart = useCallback(async (token) => {
    if (!token) return;
    try {
      const data = await api.get('/cart', token);
      setCart(data);
    } catch {
      // Not logged in yet — ignore
    }
  }, []);

  // Add item
  const addItem = useCallback(async (variantId, quantity = 1, token) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post('/cart/add', { variant_id: variantId, quantity }, token);
      setCart(data);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Update quantity (0 = remove)
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

  // Remove one item
  const removeItem = useCallback(async (cartItemId, token) => {
    return updateItem(cartItemId, 0, token);
  }, [updateItem]);

  // Clear entire cart
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
