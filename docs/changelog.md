# Changelog

All notable changes to TAS (Transporindo Export Admin System).

Format: [version] — date — description

---

## [0.17.0] — 2026-05-21

### Added
- **PWA support** — `vite-plugin-pwa` added; app installable on desktop/mobile
- **HTTPS (production)** — server auto-detects `certs/key.pem` + `certs/cert.pem`; falls back to HTTP if certs absent (dev unaffected)
- **Cert generation script** — `npm run gen-cert` (`scripts/gen-cert.js`); called by `setup.ps1` with LAN IP as SAN
- **Deploy: port 443** — setup/update scripts now use port 443 and HTTPS URL

### Changed
- **`server/src/index.js`** — HTTPS conditional on cert existence; `cookie.secure` tied to `IS_PROD`
- **`vite.config.js`** — proxy `secure: false` added; target stays `http://localhost:8080` for dev
- **`deploy/README.txt`** — URL updated to `https://`; note about self-signed cert warning on first visit
- **`.env.example`** — `HTTPS_KEY` / `HTTPS_CERT` vars documented

---

## [0.16.0] — 2026-05-20

### Added
- **Hutang Trucking** — auto-created when container saved with trucking vendor + biaya; synced on edit/delete; `hutang_type` field distinguishes trucking vs vendor
- **Trucking payment flow** — click row to expand inline panel; "Bayar" button opens payment modal; payment history shown per row with edit + delete actions
- **Pelunasan validation** — payment modal blocks submit if amount exceeds remaining sisa; live "sisa setelah pembayaran" display
- **Lunas indicator** — "Bayar" button hidden and "✓ Lunas" shown when hutang fully paid
- **Edit/delete riwayat pembayaran** — pencil icon edits existing payment (pre-fills modal); trash deletes; PUT route now also updates `no_voucher` on hutang
- **Global Hutang page** — row click navigates to `/bookings/{id}?tab=hutang`
- **Seed script updated** — trucking vendors changed to MMC / TAS-T; container fields (trucking, biaya_trucking, in_date, out_date) included in seed

### Changed
- **BookingDetail Hutang tab** — split into Section A (Trucking table) + Section B (Vendor cards); row expand pattern with chevron indicator + left border accent
- **Migration 016** — inline: `hutang.no_voucher`, `hutang.container_id`, `hutang.hutang_type`; backfill existing containers

---

## [0.15.0] — 2026-05-19

### Added
- **Booking Documents tab** — new `BookingDocuments.jsx` tab in BookingDetail (Info/Finance/Docs); stores PEB & Phyto document numbers, SI, invoice, dates, and pelunasan info; migration `013_booking_documents.sql`; route `bookingDocuments.js`
- **Archive script** — `scripts/archive-data.js` dumps buku/shippers/commodities/bookings/containers to `server/data/archive-dump.json`
- **Mei 2026 seed script** — `scripts/seed-mei2026.js` archives existing data, wipes tables (keeps users), seeds real Buku Mei 2026 data with 6 shippers and 9 bookings

### Changed
- **BookingForm** — Port Muat (Pelabuhan Muat) now defaults to `Belawan`
- **LAN deploy** — session cookie `secure=false` for HTTP LAN deploy; `setup.ps1` creates data dir before migration

---

## [0.13.0] — 2026-05-18

### Added
- **Backup & Restore system** — `scripts/backup-db.js` (WAL checkpoint + file copy) and `scripts/restore-db.js` (validates SQLite magic bytes, checks port, confirmation prompt, removes stale WAL files); `npm run backup` / `npm run restore` scripts in server/package.json
- **Backup admin UI** — `/backup` page (admin-only); create backup with one click, list all backups by date/size, download any backup via browser; restore section shows copy-paste command with dropdown to auto-fill filename
- **Backup API** — `GET /api/backups`, `POST /api/backup`, `GET /api/backup/download/:filename`; all admin-only; path traversal protection on download; audit logs backup creation

---

## [0.11.0] — 2026-05-15

### Changed
- **BukuList UX** — year filter pill-tabs (defaults to current year) + month name search input; period count updates live; no API change, all client-side filtering
- **BukuDetail UX** — accordion replaced with master-detail split panel; left sidebar lists all shippers (name, booking count, finance metrics + progress bar); right panel shows selected shipper's bookings with search (job no / komoditi / kapal) and pagination (20 rows/page); switching shippers resets search and page

---

## [0.10.0] — 2026-05-15

### Added
- **SSE real-time updates** — `GET /api/events` Server-Sent Events endpoint; `broadcast()` utility called on all booking mutations (create/update/delete/status); `useSSE` hook subscribes in Layout and invalidates affected query keys automatically
- **Public booking IDs** — `public_id` column (random 16-byte hex) on bookings; all URL params and API routes (`GET/PUT/PATCH/DELETE /api/bookings/:id`) now use `public_id` instead of numeric ID (migration: `009_booking_public_id.sql`)
- **Toast notifications** — `Toast.jsx` component + `useToast` hook; `ToastProvider` wraps app; all mutations in BookingDetail show success/error toasts
- **Skeleton loaders** — `Skeleton.jsx` with `BookingDetailSkeleton`; BookingDetail shows skeleton while loading instead of plain text
- **PDF export** — `exportBookingInvoice` and `exportInvoiceOnly` utils in `src/utils/invoicePdf.js`; "Download Invoice" button in Invoice tab; "Export Booking PDF" in BookingDetail action menu (finance+ only)
- **DB indexes** — `008_indexes.sql` performance indexes on frequently queried columns

### Changed
- **Code splitting** — all pages converted to `React.lazy()` + `Suspense` with `PageLoader` spinner; reduces initial bundle size
- **Query N+1 fix** — bookings list fetches all containers in one batched query instead of one per row; buku detail uses `pay_agg` LEFT JOIN subquery instead of correlated subquery per booking
- **QueryClient config** — added `gcTime: 5min` and `refetchOnWindowFocus: true`; stale queries now refetch when tab regains focus
- **Breadcrumb** — BookingDetail buku crumb shows human-readable month label (e.g. "Mei 2026") via `monthLabel()`

---

## [0.9.0] — 2026-05-15

### Changed
- **BookingDetail v2** — full tabbed layout with journey timeline, shipment hero card, and document checklist; replaces single-scroll layout
- **Theme toggle** — light/dark mode switcher in Layout sidebar; persisted in `localStorage`; flash-free inline script in `index.html` applies theme before React mounts
- **Geist font** — Geist + Geist Mono loaded via Google Fonts; monospace used for dates, codes, and finance figures
- **`useTheme` hook** — new `src/hooks/useTheme.js` manages theme state and `document.documentElement.className`
- **CSS** — `bd-tabs`, `bd-tab`, `journey`, `shipment-hero`, `doc-list` component classes added to design system

---

## [0.8.0] — 2026-05-15

### Added
- **Custom design system** — full CSS variable token system in `index.css`; dark (default) and light themes via `.theme-dark` / `.theme-light` classes; accent color tokens
- **Icons component** — `Icons.jsx` with unified icon set (IconBook, IconBox, IconUsers, IconActivity, IconShipper, IconArrow, LogoMark, etc.)
- **UI primitives** — `ui.jsx` shared component library for buttons, inputs, chips, cards
- **Sectioned sidebar nav** — Layout redesigned with grouped sections (Operasional / Finance / Admin); user avatar with initials + role chip; visibility controlled by RBAC
- **ProtectedRoute on all booking routes** — BookingsList gated to admin; BookingForm/BookingDetail open to worker+
- **seed-db.js script** — dev utility to seed database with sample data

### Changed
- All pages restyled to use design system tokens — Login, BookingsList, BookingForm, BookingDetail, BukuList, BukuDetail, BukuFinance, Piutang, Hutang, Shippers, Users, AuditLog
- Layout sidebar replaces top nav; user info block at bottom with initials avatar and role chip
- `vite.config.js` updated (proxy and build config refinements)
- Server routes (hutang, piutang, buku, shippers) minor fixes and cleanup

---

## [0.7.0] — 2026-05-13

### Added
- **Real authentication enforcement** — `requireRole(minRole)` middleware applied to every API route; hierarchy: worker < finance < admin
- **3-role RBAC** — `finance` role added alongside `admin` and `worker`; role enum updated in user create/update schemas
- **ProtectedRoute component** — client-side route guard; redirects unauthenticated users to `/login`; shows "Access Denied" for insufficient role
- **Login page wired** — `useAuth` hook replaced stub with real TanStack Query fetch of `/api/auth/me`; `useLogin`/`useLogout` call real endpoints
- **401 interceptor** — axios client redirects to `/login` on any 401 response
- **Finance role access** — finance role can access BukuFinance, Piutang, Hutang, Finance summary pages and "Lihat Finance" button in BukuDetail
- **BookingDetail finance sections gated** — Invoice, Piutang, Hutang sections hidden from worker role; visible only to finance and admin
- **User delete** — `DELETE /api/users/:id` endpoint (admin only); blocks self-delete; inline confirm in UI
- **User edit with password change** — edit row expands to full-width form; optional new password field with show/hide toggle
- **commodityRoutes registered** — `GET/POST /api/commodities` now active in server

### Changed
- `STUB_USER_ID` removed from all route handlers — real `request.session.user.id` used throughout
- `requireRole` now uses hierarchy check instead of exact match
- Nav links conditionally rendered based on role (Piutang/Hutang for finance+; Shippers/Users/Audit for admin only)
- Sign out button added to header
- `staleTime` set to 0 — queries refetch on mount, fixing stale data after mutations
- `keepPreviousData` (v4 API) replaced with `placeholderData: (prev) => prev` (v5) in BookingsList and AuditLog
- Duplicate `DELETE /api/commodities/:id` removed from commodities.js (already in shippers.js)

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
