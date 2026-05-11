/**
 * geoProvider.js
 * ─────────────────────────────────────────────────────────────────
 * ABSTRACTION LAYER — all geo logic in the app flows through here.
 *
 * CURRENT PROVIDER : Leaflet + OpenStreetMap (free, no API key)
 * FUTURE  PROVIDER : Google Maps Platform (paid, higher accuracy)
 *
 * TO SWITCH TO GOOGLE:
 *   1. npm install @googlemaps/js-api-loader
 *   2. Add VITE_GOOGLE_MAPS_KEY=your_key to .env
 *   3. Comment out the LEAFLET PROVIDER block below
 *   4. Uncomment the GOOGLE PROVIDER block below
 *   5. Nothing else in the app needs to change.
 * ─────────────────────────────────────────────────────────────────
 */

// ─── SHARED TYPES (both providers must return these shapes) ───────
//
// DetectedPosition : { lat: number, lng: number, accuracy: number }
// MapInstance      : opaque ref — pass to mountMap() and destroyMap()
// MarkerInstance   : opaque ref — pass to moveMarker()
//
// ─────────────────────────────────────────────────────────────────


// ════════════════════════════════════════════════════════════════
//  LEAFLET PROVIDER  (ACTIVE)
//  Uses: Leaflet.js + OpenStreetMap tiles — 100% free
// ════════════════════════════════════════════════════════════════

/**
 * Detect user position via browser Geolocation API.
 * Returns a Promise<DetectedPosition>.
 */
export function detectPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      (err) => {
        const messages = {
          1: 'Location access denied. Please allow location in your browser.',
          2: 'Location unavailable. Try again.',
          3: 'Request timed out. Try again.',
        };
        reject(new Error(messages[err.code] || 'Unknown geolocation error.'));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

/**
 * Mount a Leaflet map into a DOM element.
 * Returns a MapInstance (Leaflet map object).
 *
 * @param {HTMLElement} container  - DOM node to render map into
 * @param {number}      lat
 * @param {number}      lng
 * @param {Function}    onPositionChange - called with {lat, lng} on pin move
 */
export function mountMap(container, lat, lng, onPositionChange) {
  // Leaflet is loaded as a script tag in index.html (see public/index.html)
  const L = window.L;
  if (!L) throw new Error('Leaflet not loaded. Check index.html script tags.');

  const map = L.map(container, {
    zoomControl: true,
    attributionControl: false,
  }).setView([lat, lng], 17);

  // OpenStreetMap tiles — free, no key required
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);

  // Custom SVG pin (matches original GeoPin design)
  const pinIcon = L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
      <filter id="gp-shadow" x="-40%" y="-20%" width="180%" height="180%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.45)"/>
      </filter>
      <g filter="url(#gp-shadow)">
        <path d="M18 2C9.716 2 3 8.716 3 17c0 10.5 15 29 15 29S33 27.5 33 17C33 8.716 26.284 2 18 2z" fill="#ff4d6d"/>
        <circle cx="18" cy="17" r="7" fill="#fff"/>
        <circle cx="18" cy="17" r="4" fill="#ff4d6d"/>
      </g>
    </svg>`,
    className: '',
    iconSize: [36, 48],
    iconAnchor: [18, 48],
    popupAnchor: [0, -48],
  });

  const marker = L.marker([lat, lng], {
    icon: pinIcon,
    draggable: true,
  }).addTo(map);

  // Drag events
  marker.on('drag', (e) => {
    const p = e.target.getLatLng();
    onPositionChange({ lat: p.lat, lng: p.lng });
  });
  marker.on('dragend', (e) => {
    const p = e.target.getLatLng();
    onPositionChange({ lat: p.lat, lng: p.lng });
    map.panTo(p);
  });

  // Click-to-move
  map.on('click', (e) => {
    marker.setLatLng(e.latlng);
    onPositionChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    map.panTo(e.latlng);
  });

  // Attach marker to map object so moveMarker() can reach it
  map._geoMarker = marker;

  return map; // MapInstance
}

/**
 * Programmatically move the pin and re-centre the map.
 *
 * @param {MapInstance} mapInstance
 * @param {number}      lat
 * @param {number}      lng
 */
export function moveMarker(mapInstance, lat, lng) {
  const L = window.L;
  mapInstance._geoMarker.setLatLng([lat, lng]);
  mapInstance.setView([lat, lng], 17);
}

/**
 * Tear down the map instance and free memory.
 *
 * @param {MapInstance} mapInstance
 */
export function destroyMap(mapInstance) {
  if (mapInstance) mapInstance.remove();
}


// ════════════════════════════════════════════════════════════════
//  GOOGLE MAPS PROVIDER  (FUTURE — NOT ACTIVE)
//  Uncomment this entire block and comment out the Leaflet block
//  above when you have a Google Maps API key.
//
//  Requirements:
//    npm install @googlemaps/js-api-loader
//    VITE_GOOGLE_MAPS_KEY=AIza... in .env
// ════════════════════════════════════════════════════════════════

/*
import { Loader } from '@googlemaps/js-api-loader';

let _googleLoader = null;

async function _loadGoogle() {
  if (!_googleLoader) {
    _googleLoader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
      version: 'weekly',
      libraries: ['places'],
    });
  }
  return _googleLoader.load();
}

export function detectPosition() {
  // Same browser API — shared between both providers
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      (err) => {
        const messages = {
          1: 'Location access denied. Please allow location in your browser.',
          2: 'Location unavailable. Try again.',
          3: 'Request timed out. Try again.',
        };
        reject(new Error(messages[err.code] || 'Unknown geolocation error.'));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export async function mountMap(container, lat, lng, onPositionChange) {
  await _loadGoogle();
  const google = window.google;

  const map = new google.maps.Map(container, {
    center: { lat, lng },
    zoom: 17,
    disableDefaultUI: false,
    gestureHandling: 'greedy',
  });

  const marker = new google.maps.Marker({
    position: { lat, lng },
    map,
    draggable: true,
    icon: {
      path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
      scale: 8,
      fillColor: '#ff4d6d',
      fillOpacity: 1,
      strokeColor: '#fff',
      strokeWeight: 2,
    },
  });

  marker.addListener('drag', () => {
    const pos = marker.getPosition();
    onPositionChange({ lat: pos.lat(), lng: pos.lng() });
  });
  marker.addListener('dragend', () => {
    const pos = marker.getPosition();
    onPositionChange({ lat: pos.lat(), lng: pos.lng() });
    map.panTo(pos);
  });

  map.addListener('click', (e) => {
    marker.setPosition(e.latLng);
    onPositionChange({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    map.panTo(e.latLng);
  });

  map._geoMarker = marker;
  return map;
}

export function moveMarker(mapInstance, lat, lng) {
  const google = window.google;
  const latlng = new google.maps.LatLng(lat, lng);
  mapInstance._geoMarker.setPosition(latlng);
  mapInstance.setCenter(latlng);
}

export function destroyMap(mapInstance) {
  // Google Maps has no official destroy — null out the reference
  if (mapInstance) {
    mapInstance._geoMarker.setMap(null);
  }
}
*/
