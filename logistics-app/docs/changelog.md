# Changelog

## [Unreleased]

### Added
- Migration `010_buku_status_audit.sql`: buku `closed_at` / `closed_by` audit columns
- `bukuGuard.js` utility: `isBukuClosed()` helper to block mutations on closed buku
- BukuDetail: inline search/filter toolbar for bookings within shipper group
- `seed-db.js`: public_id generation via `randomBytes`, stress-test dataset (100 bookings/shipper, May 2026)

---

## [0.11.0] — 2026-05-16

### Added
- BukuDetail: year filter tabs to switch between fiscal years
- BukuDetail: master-detail shipper view — click shipper to drill into booking list
- BukuDetail: CSS refinements for accordion and shipper detail panels

---

## [0.10.0]

### Added
- SSE (Server-Sent Events) for real-time booking status updates
- Public booking IDs (UUID-style) for shareable URLs
- Toast notification system (`Toast.jsx`, `ToastProvider`)
- PDF export: single booking invoice and shipper monthly invoice (`invoicePdf.js`)
- Code splitting via React lazy/Suspense on all page components

---

## [0.9.0]

### Added
- BookingDetail v2: tabbed layout (Shipment / Invoice / Piutang / Hutang)
- Timeline view for booking events
- Light/dark theme toggle in Layout

---

## [0.8.0]

### Added
- Complete UI redesign with custom design system (CSS custom properties, design tokens)
- `ui.jsx` component library: Badge, Button, Card, Stat, Progress, Empty, Modal, PageHeader, Field, Input, Select

---

## [0.7.0 and earlier]

- 3-role RBAC (admin / finance / worker) with session-based auth
- Buku (monthly ledger) with buku-first navigation
- Shippers & commodities master data
- Invoice line items replacing dokumen
- Finance sections: piutang, hutang, pembayaran
- Repo initialization with Fastify/SQLite backend + React/Vite frontend
