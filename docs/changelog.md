# Changelog

All notable changes to TAS (Transporindo Export Admin System).

Format: [version] — date — description

---

## [0.3.0] — 2026-05-13

### Added
- **Hutang (AP) module** — full CRUD, optional booking link, payment tracking via `pembayaran` table
- **Piutang (AR) module** — one per booking, auto-fill from dokumen biaya, payment tracking
- **Pembayaran table** — shared payment history for hutang and piutang (entity_type + entity_id polymorphic)
- **Finance summary endpoint** — `GET /api/finance/summary` (total piutang, hutang, outstanding)
- **Dedicated Piutang page** — list all piutang across bookings, filter by status
- **Dedicated Hutang page** — list all hutang, filter by status, create standalone hutang
- **BookingDetail finance sections** — inline PiutangSection and HutangSection with payment forms
- Derived status: `belum_bayar` | `sebagian` | `lunas` computed from pembayaran sum

---

## [0.2.0] — 2026-05-12

### Added
- **Dokumen module** — expense documents (tipe, no_dokumen, biaya) nested under bookings
- Inline Dokumen section in BookingDetail with add/edit/delete
- `dokumen` table migration (002_dokumen.sql)

### Changed
- BookingDetail now shows formatted IDR biaya for each dokumen row

---

## [0.1.0] — 2026-05-12

### Added
- **Bookings CRUD** — create, read, update, soft-delete, status toggle
- **Containers** — multi-container input per booking, derived qty display
- **Users** — admin/worker roles, bcrypt password hashing, activate/deactivate
- **Audit log** — immutable record of all mutations
- **Session auth** — login/logout endpoints, httpOnly session cookie
- **CSV export** — bookings export with date range filter
- Fastify REST API (port 8080) with SQLite WAL mode
- React 19 + Vite + TailwindCSS v4 frontend (port 5173)
- Full-text search on bookings list (job_no, shipper, container_no, etc.)
- Pagination on bookings and audit log
