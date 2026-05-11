/**
 * client/src/hooks/useAuth.js
 * Global auth state — user + token.
 *
 * Usage:
 *   const { user, token, login, logout } = useAuth();
 *
 * Token stored in memory only (not localStorage — XSS risk).
 * On page refresh user must log in again.
 * Phase 5 can add refresh tokens to persist sessions.
 */

import { useState, useCallback, createContext, useContext } from 'react';
import api from '../services/api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState(null);

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    setUser(data.user);
    setToken(data.token);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await api.post('/auth/register', { name, email, password });
    setUser(data.user);
    setToken(data.token);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
