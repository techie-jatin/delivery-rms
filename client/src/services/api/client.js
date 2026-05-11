/**
 * client/src/services/api/client.js
 * Base fetch wrapper. All API calls go through here.
 *
 * Usage:
 *   import api from './client';
 *   const data = await api.post('/delivery/check', { lat, lng });
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong.');
  }

  return data;
}

const api = {
  get:    (path, token)        => request('GET',    path, null, token),
  post:   (path, body, token)  => request('POST',   path, body, token),
  put:    (path, body, token)  => request('PUT',    path, body, token),
  delete: (path, token)        => request('DELETE', path, null, token),
};

export default api;
