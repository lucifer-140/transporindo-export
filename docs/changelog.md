# Changelog

All notable changes to TAS (Transporindo Export Admin System).

Format: [version] — date — description

---

## [0.6.0] — 2026-05-13

### Added
- **Buku (Monthly Ledger)** — `buku` table per YYYY/MM; all bookings now belong to a buku; new `buku_id` FK on bookings
- **BukuList page** (`/`) — home page; lists all buku with booking count and open/closed status; create new buku via modal
- **BukuDetail page** (`/buku/:id`) — shipper breakdown accordion with total tagihan / dibayar / sisa per shipper; drill down to booking list per shipper; auto-refreshes every 15s
- **Buku-first navigation flow** — "+ Booking Baru" from BukuDetail passes buku context to BookingForm; no dropdown needed
- **system-flow.md** — complete non-technical user guide for the full system flow

### Changed
- Home page changed from BookingsList to BukuList
- BookingForm — buku shown as read-only label (passed via navigation state); removed buku dropdown
- BookingDetail back button — returns to originating buku page instead of home
- Nav — removed Bookings / Piutang / Hutang from main nav (access via buku); kept Buku, Users, Shippers, Audit Log
- Auth — removed `requireAuth` from all routes and 401→/login redirect (auth not yet implemented)

---

## [0.5.0] — 2026-05-13

### Added
- **Shippers & Commodities master data** — dedicated management page (`/shippers`) to create shippers and add commodities per shipper; cascading delete
- **Commodity linked to shipper** — `commodities` table has `shipper_id` FK; each commodity belongs to one shipper; a shipper can have multiple commodities
- **`commodity` field on bookings** — stored in DB, included in create/update API and booking form
- **Smart commodity select in BookingForm** — selecting a shipper auto-fills commodity if shipper has exactly 1; shows dropdown if multiple; disabled if none
- Nav link: **Shippers** added to header

---

## [0.4.0] — 2026-05-13

### Changed
- **Dokumen → Invoice section** — replaced flat dokumen table with proper invoice line items (Uraian, Qty, Harga Satuan, Jumlah); total row shown at bottom
- `dokumen` table extended with `qty` and `harga_satuan` columns; `biaya` now stored as `qty × harga_satuan` (migration: `004_invoice.sql`)
- **Piutang + Hutang sections restored** — both sections now visible in BookingDetail (`SHOW_FINANCE = true`)
- **Metode payment field** — all pembayaran (piutang + hutang) now capture payment method: cash / transfer / giro / lainnya; shown in payment history tables (migration: `005_pembayaran_metode.sql`)
- Piutang auto-fill button relabeled "Auto dari Invoice" — pulls from invoice line item totals
- Payment forms expanded to 4-column grid (Tanggal / Jumlah / Metode / Keterangan)

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
