# Architecture — TAS

## Overview

Monorepo. Fastify REST API backend + React SPA frontend. SQLite database. Session-based auth via httpOnly cookies.

```
Browser (React/Vite :5173)
    |
    | HTTP /api/* (proxied in dev, served directly in prod)
    v
Fastify Server (:8080)
    |
    | better-sqlite3 (synchronous)
    v
SQLite (data/app.db, WAL mode)
```

## Server (`logistics-app/server/`)

```
src/
  index.js          — App entry: register plugins, mount routes, serve static in prod
  db.js             — Singleton DB connection, run migrations on first connect
  migrations/
    001_init.sql    — Core tables: users, bookings, containers, audit_log, sessions
    002_dokumen.sql — dokumen table
    003_finance.sql — piutang, hutang, pembayaran tables
  routes/
    auth.js         — POST /api/auth/login, /logout, GET /api/auth/me
    bookings.js     — CRUD bookings + containers, CSV export
    dokumen.js      — Nested CRUD under /api/bookings/:id/dokumen
    piutang.js      — Per-booking piutang + list + pembayaran
    hutang.js       — Hutang CRUD (standalone or booking-linked) + pembayaran
    finance.js      — GET /api/finance/summary aggregate
    users.js        — User CRUD (admin only)
  middleware/
    requireAuth.js  — Checks session.user, returns 401
    requireRole.js  — Checks session.user.role, returns 403
  schemas/
    booking.js      — Zod schemas: bookingSchema, containerSchema, statusSchema
  utils/
    audit.js        — logAudit(): inserts into audit_log
```

### Request Lifecycle

```
Request → Fastify route handler
  → Zod validation (safeParse)
  → DB query (better-sqlite3, synchronous)
  → logAudit() (mutations only)
  → JSON response
```

### Auth

- Login sets `request.session.user = { id, username, role }`
- Session stored in SQLite `sessions` table
- Cookie: httpOnly, sameSite=lax, 8h maxAge, secure in prod
- `requireAuth` / `requireRole` middleware defined but not yet wired on all routes (STUB_USER_ID=1 used in all route handlers)

### Migration Strategy

`db.js:runMigrations()` runs on every server start. All SQL uses `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN` wrapped in try/catch — idempotent.

## Client (`logistics-app/client/`)

```
src/
  main.jsx          — React root, QueryClient setup (staleTime 30s, retry 1)
  App.jsx           — React Router routes
  api/
    client.js       — Axios instance (/api base, withCredentials, 401 redirect)
  hooks/
    useAuth.js      — Auth hooks (stub: returns hardcoded admin user)
  components/
    Layout.jsx      — Top navbar, Outlet
    ContainerInputRow.jsx — Controlled input row for container forms
  pages/
    BookingsList.jsx  — Paginated list, search/filter, CSV export
    BookingForm.jsx   — Create/edit booking with dynamic container rows
    BookingDetail.jsx — Read detail + DokumenSection + PiutangSection + HutangSection
    Piutang.jsx       — List all piutang, filter by status
    Hutang.jsx        — List all hutang, filter by status, create standalone
    Users.jsx         — User management (admin)
    AuditLog.jsx      — Read-only audit log (admin)
    Login.jsx         — Login form (stub hooks)
```

### Data Fetching

TanStack Query v5. Query keys:

| Key | Data |
|-----|------|
| `['bookings', { q, status, from, to, page }]` | Booking list |
| `['booking', id]` | Single booking |
| `['dokumen', bookingId]` | Dokumen for booking |
| `['piutang', bookingId]` | Piutang for booking |
| `['hutang-booking', bookingId]` | Hutang linked to booking |
| `['piutang-list', { q, page }]` | All piutang |
| `['hutang-list', { q, page }]` | All hutang |
| `['users']` | User list |
| `['audit', page]` | Audit log |

### Vite Dev Proxy

All `/api` requests proxied to `http://localhost:8080` in development. In production, Fastify serves the built `client/dist/` via `@fastify/static`.

## Data Flow — Finance Example

```
Booking created
  → Worker adds Dokumen (tipe=PEB, biaya=500000)
  → Worker creates Piutang (auto-fill from Dokumen sum = 500000)
  → Client pays: Worker adds Pembayaran (jumlah=500000)
  → Piutang status derived: lunas (total_paid >= jumlah)

Vendor invoices company
  → Worker creates Hutang (pihak=Vendor X, jumlah=200000, booking_id=optional)
  → Company pays vendor: Worker adds Pembayaran to Hutang
  → Hutang status derived: lunas
```

## Deployment

Production: `npm run build` in client → output to `server/public/`. Fastify serves static files and falls back to `index.html` for SPA routing.
