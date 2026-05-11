# GEO_SWITCH.md
## How to switch from Leaflet/OSM → Google Maps

Everything geo-related is isolated behind one abstraction layer.
When you're ready to upgrade, you change **5 files** and nothing else
in the app needs to touch a map API ever again.

---

### Why we built it this way

The original `geolocation_map_picker.html` used:
- `navigator.geolocation` (browser, free, stays the same forever)
- Leaflet.js + OpenStreetMap tiles (free, no key, limited accuracy)

Google Maps gives us:
- Autocomplete address search (huge UX win)
- Real road distance (not straight-line) for accurate ETAs
- Better satellite/street view tiles
- Distance Matrix API for multi-stop delivery routing

We defer the cost until we have paying users.

---

### The 5-file checklist

#### 1. `client/index.html`
```diff
- <!-- Leaflet CSS + JS script tags (active) -->
+ <!-- Google Maps script tag (uncomment, replace YOUR_KEY) -->
```

#### 2. `client/src/services/geo/geoProvider.js`
```diff
- // Leaflet PROVIDER block (active)
+ // Google PROVIDER block (uncomment the bottom block)
```
The function signatures (`detectPosition`, `mountMap`, `moveMarker`, `destroyMap`)
stay **identical**. The hook and component don't change at all.

#### 3. `client/src/services/geo/deliveryZone.js`
```diff
- // haversineDistanceKm() used inside findNearestServiceableOutlet()
+ // getRoadDistanceKm() — uncomment, replace haversine call
```
This makes the local pre-check use real road distance too.
Note: `getRoadDistanceKm` is async — update `findNearestServiceableOutlet`
to be async as well.

#### 4. `server/src/routes/delivery.routes.js`
```diff
- // estimateEta() — simple speed formula
+ // getRoadEta() — uncomment, call Google Directions API
```
Also add `GOOGLE_MAPS_KEY=AIza...` to server `.env`.

#### 5. `client/.env` (new line)
```
VITE_GOOGLE_MAPS_KEY=AIza...
```

---

### APIs to enable on Google Cloud Console

| API                         | Used for                          |
|-----------------------------|-----------------------------------|
| Maps JavaScript API         | Map tiles + marker rendering      |
| Places API                  | Address autocomplete (Phase 3.4)  |
| Geocoding API               | Address → coordinates             |
| Distance Matrix API         | Road distance + ETA               |
| Directions API              | Server-side route ETA             |

---

### Cost estimate (as of 2025)

| API call                    | Free tier / month | Per 1000 after |
|-----------------------------|-------------------|----------------|
| Maps loads                  | 28,500            | $7             |
| Geocoding requests          | 40,000            | $5             |
| Distance Matrix elements    | 40,000            | $10            |

For a Kota-scale launch (hundreds of orders/day), you'll stay free tier
for the first few months easily.

---

### What does NOT change

- `useGeoLocation.js` hook — zero changes
- `GeoLocationPicker.jsx` component — zero changes
- `GeoLocationPicker.css` — zero changes
- All backend routes except `delivery.routes.js`
- Database schema — zero changes
- Any other frontend page or component

The abstraction is airtight.

---

### Verify after switching

```bash
# 1. Map loads without console errors
# 2. Pin drops on detected location
# 3. Dragging pin updates coordinates
# 4. POST /delivery/check returns road-based ETA (not formula estimate)
# 5. Console shows no Leaflet references
```
