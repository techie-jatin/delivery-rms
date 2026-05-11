/**
 * deliveryZone.js
 * ─────────────────────────────────────────────────────────────────
 * Local (device-side) delivery zone checks.
 * Runs BEFORE the backend call — gives the user instant feedback.
 *
 * Used in Phase 2 of the roadmap:
 *   Step 2.2 — Frontend geo detection (local check)
 *   Step 2.4 — Dynamic delivery fee by distance
 *
 * ALL functions are pure — no side effects, no API calls.
 * ─────────────────────────────────────────────────────────────────
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Haversine formula — straight-line distance between two coordinates.
 * Fast, runs in microseconds. Good for quick radius pre-check.
 *
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} distance in kilometres
 */
export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Ray-casting algorithm — checks if a point is inside a GeoJSON polygon.
 * Used when delivery zone is a custom polygon, not just a radius.
 *
 * @param {number}    lat
 * @param {number}    lng
 * @param {number[][]} polygon  - array of [lng, lat] pairs (GeoJSON order)
 * @returns {boolean}
 */
export function isPointInPolygon(lat, lng, polygon) {
  let inside = false;
  const x = lng;
  const y = lat;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Delivery fee tier — based on straight-line distance from outlet.
 * Configurable tiers; admin can override via API later (Phase 4.2).
 *
 * @param {number} distanceKm
 * @returns {{ fee: number, label: string }}
 */
export function getDeliveryFee(distanceKm) {
  if (distanceKm <= 2)  return { fee: 20,  label: '0–2 km' };
  if (distanceKm <= 5)  return { fee: 40,  label: '2–5 km' };
  if (distanceKm <= 8)  return { fee: 70,  label: '5–8 km' };
  return { fee: null, label: 'Out of range' }; // null = not serviceable
}

/**
 * Check a user position against a pre-downloaded list of outlets.
 * Runs entirely on-device — gives instant result before backend validates.
 *
 * Outlet shape (from GET /outlets response):
 * {
 *   id, name,
 *   lat, lng,                          // outlet coordinates
 *   delivery_radius_km,                // fallback if no polygon
 *   delivery_zone: [[lng,lat], ...],   // GeoJSON polygon coordinates (optional)
 * }
 *
 * Returns the nearest serviceable outlet or null.
 *
 * @param {number}   userLat
 * @param {number}   userLng
 * @param {Object[]} outlets
 * @returns {{ outlet: Object, distanceKm: number, fee: number } | null}
 */
export function findNearestServiceableOutlet(userLat, userLng, outlets) {
  let best = null;

  for (const outlet of outlets) {
    const distanceKm = haversineDistanceKm(
      userLat, userLng,
      outlet.lat, outlet.lng
    );

    let inZone = false;

    // Prefer polygon check if available
    if (outlet.delivery_zone && outlet.delivery_zone.length >= 3) {
      inZone = isPointInPolygon(userLat, userLng, outlet.delivery_zone);
    } else {
      // Fallback to radius
      inZone = distanceKm <= (outlet.delivery_radius_km ?? 5);
    }

    if (!inZone) continue;

    // Pick nearest serviceable outlet
    if (!best || distanceKm < best.distanceKm) {
      const { fee } = getDeliveryFee(distanceKm);
      best = { outlet, distanceKm, fee };
    }
  }

  return best; // null if no outlet serves this location
}


// ════════════════════════════════════════════════════════════════
//  GOOGLE MAPS DISTANCE MATRIX  (FUTURE — NOT ACTIVE)
//  Replace haversineDistanceKm with actual road distance when
//  Google Maps API is enabled. This gives accurate road-based ETAs.
//
//  Usage: uncomment and call getRoadDistanceKm() instead of
//  haversineDistanceKm() inside findNearestServiceableOutlet().
// ════════════════════════════════════════════════════════════════

/*
export async function getRoadDistanceKm(originLat, originLng, destLat, destLng) {
  // Requires Google Maps Distance Matrix API to be enabled on your key
  // and @googlemaps/js-api-loader loaded in geoProvider.js
  const google = window.google;
  const service = new google.maps.DistanceMatrixService();

  return new Promise((resolve, reject) => {
    service.getDistanceMatrix(
      {
        origins: [new google.maps.LatLng(originLat, originLng)],
        destinations: [new google.maps.LatLng(destLat, destLng)],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (status !== 'OK') {
          reject(new Error(`Distance Matrix error: ${status}`));
          return;
        }
        const element = response.rows[0].elements[0];
        if (element.status !== 'OK') {
          reject(new Error(`Route not found: ${element.status}`));
          return;
        }
        // element.distance.value is in metres
        resolve(element.distance.value / 1000);
      }
    );
  });
}
*/
