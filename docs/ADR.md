# Architecture Decision Record

All major stack decisions documented here. Every decision has a reason and a trade-off.

---

## ADR-001: Frontend — React + Vite

**Decision:** React 18 with Vite as build tool.  
**Reason:** Fast HMR, excellent ecosystem, GitHub Pages compatible static output.  
**Trade-off:** SPA — needs proper 404 handling for GitHub Pages (add `404.html` redirect).  
**Alternative considered:** Next.js — rejected because GitHub Pages doesn't run Node.js servers.

---

## ADR-002: Backend — Node.js + Express

**Decision:** Node.js with Express.  
**Reason:** Same language as frontend (JavaScript), huge ecosystem, lightweight for this scale.  
**Trade-off:** Not opinionated — we enforce structure ourselves via CLAUDE.md rules.  
**Alternative considered:** FastAPI (Python) — rejected to keep one language across the project.

---

## ADR-003: Database — PostgreSQL 16 + PostGIS

**Decision:** PostgreSQL with PostGIS extension.  
**Reason:** PostGIS gives us `ST_Within`, `ST_Distance`, `ST_MakePoint` — essential for delivery zone queries. Far more powerful than radius checks alone.  
**Trade-off:** Requires PostGIS installed on the server. Railway and Render both support it.  
**Alternative considered:** MongoDB with geo queries — rejected because PostGIS is significantly more powerful for polygon operations.

---

## ADR-004: ORM — Knex.js

**Decision:** Knex.js query builder (not a full ORM).  
**Reason:** Lets us write raw SQL for geo queries (PostGIS functions) without fighting an ORM abstraction. Migrations are first-class.  
**Trade-off:** More verbose than Prisma for simple CRUD. Worth it for geo query control.  
**Alternative considered:** Prisma — rejected because its PostGIS support requires raw SQL fallbacks anyway.

---

## ADR-005: Maps — Leaflet.js + OpenStreetMap (Phase 0–4)

**Decision:** Leaflet.js with free OpenStreetMap tiles.  
**Reason:** Zero cost, no API key, works offline for development, accurate enough for delivery zone display.  
**Trade-off:** No address autocomplete, no real road distances (Haversine only).  
**Switch plan:** See `docs/GEO_SWITCH.md` — 5 file changes to go to Google Maps.  
**Switch trigger:** When we need address autocomplete or road-accurate ETAs. Likely Phase 5.

---

## ADR-006: Auth — JWT (access + refresh tokens)

**Decision:** JWT with short-lived access tokens (15min) + refresh tokens (7d).  
**Reason:** Stateless, works well with SPAs, no session storage needed server-side.  
**Trade-off:** Token invalidation requires a refresh token blocklist (add in Phase 1.2 if needed).  
**Access token storage:** Memory only (React state). Never localStorage — XSS risk.  
**Refresh token storage:** HttpOnly cookie.

---

## ADR-007: Hosting — GitHub Pages (frontend) + manual (backend)

**Decision:** Frontend to GitHub Pages via `vite build`. Backend deployed manually.  
**Reason:** GitHub Pages is free and the user has existing GitHub workflow.  
**Trade-off:** GitHub Pages is static only — backend must be separate (Railway / Render free tier recommended).  
**Backend plan:** Document manual deploy steps in Phase 5. Railway free tier = $0 until scale.
