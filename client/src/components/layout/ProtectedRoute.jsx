/**
 * client/src/components/layout/ProtectedRoute.jsx
 * Redirects unauthenticated users to /login.
 * Usage: wrap any route element with <ProtectedRoute>
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    if (!user) {
      // Save intended path so we can redirect back after login
      navigate('/login', { state: { from: location.pathname }, replace: true });
    }
  }, [user, navigate, location]);

  if (!user) return null;
  return children;
}
