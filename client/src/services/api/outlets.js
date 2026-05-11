/**
 * client/src/services/api/outlets.js
 * Fetches outlet list from backend.
 * Called once on app load — results passed to useGeoLocation hook.
 */

import api from './client';

export async function fetchOutlets() {
  const data = await api.get('/outlets');
  return data.outlets;
}
