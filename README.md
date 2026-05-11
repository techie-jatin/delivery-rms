# Delivery RMS

A full-stack grocery delivery + retail management system built for Kota, Rajasthan.

## Stack

| Layer     | Tech                              |
|-----------|-----------------------------------|
| Frontend  | React + Vite + React Router       |
| Backend   | Node.js + Express                 |
| Database  | PostgreSQL 16 + PostGIS           |
| ORM       | Knex.js                           |
| Maps      | Leaflet.js + OpenStreetMap (free) |
| Auth      | JWT (access + refresh tokens)     |
| Hosting   | GitHub Pages (frontend)           |

## Project structure

```
delivery-rms/
├── client/          # React frontend (Vite)
├── server/          # Node.js + Express API
├── db/              # Migrations + seeds
└── docs/            # Architecture decisions, guides
```

## Quick start

### Prerequisites
- Node.js 20+
- PostgreSQL 16 with PostGIS extension
- Git

### 1. Clone & install

```bash
git clone <your-repo-url>
cd delivery-rms

# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install
```

### 2. Environment

```bash
# Server
cp server/.env.example server/.env
# Fill in: DB_URL, JWT_SECRET, JWT_REFRESH_SECRET

# Client
cp client/.env.example client/.env
# Fill in: VITE_API_URL
```

### 3. Database

```bash
cd server
npm run db:migrate   # Run all migrations
npm run db:seed      # Seed sample data (optional)
```

### 4. Run

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Frontend: http://localhost:5173  
API: http://localhost:4000

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for the full 6-phase build plan.

## Geo provider

Currently using Leaflet + OpenStreetMap (free).  
To switch to Google Maps when ready: see [docs/GEO_SWITCH.md](docs/GEO_SWITCH.md).
