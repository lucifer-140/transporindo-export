# Project Status

**Version:** 0.19.0
**Last Updated:** 2026-06-26
**Stage:** Active Development — simplification rebuild base

---

## Completed

| Module | Status | Notes |
|--------|--------|-------|
| Buku (Monthly Ledger) | Done | YYYY/MM ledger; bookings belong to a buku; BukuList with year filter tabs + month search; BukuDetail with master-detail split panel (shipper sidebar + paginated booking table with search) |
| Shippers & Commodities | Done | Master data management; commodities linked to shipper; smart auto-fill in booking form |
| Bookings CRUD | Done | Soft-delete, search, CSV export, shipper/commodity fields; buku-first creation flow |
| Containers | Done | Multi-container per booking, derived qty; 2x20 size (dual cont/seal); planned qty with mismatch warning; duplicate cont no validation |
| Invoice (was Dokumen) | Done | Line items: Uraian/Qty/Harga Satuan/Jumlah; total row |
| Users + Roles | Done | admin/finance/worker; bcrypt; edit (full_name, role, password); delete with confirm |
| Audit Log | Done | Read-only, paginated; admin-only access |
| Session Auth | Done | Real login/logout; useAuth fetches /api/auth/me; 401 interceptor redirects to /login |
| RBAC — Route Protection | Done | requireRole(minRole) on all server routes; ProtectedRoute on all client routes |
| RBAC — Role Hierarchy | Done | worker < finance < admin; finance role accesses all finance pages |
| Hutang (AP) | Done | CRUD, optional booking link, payment history, metode field, derived status; trucking hutang auto-created from Jadwal Trucking; inline row-expand with edit/delete payments; sisa validation |
| Piutang (AR) | Done | Per-booking, auto-fill from invoice total, payment history, metode field, derived status |
| Finance Summary | Done | `/api/finance/summary` aggregate; finance+ access only |
| BukuFinance page | Done | Finance view per buku; accessible to finance and admin roles |
| System Flow Doc | Done | `docs/system-flow.md` — non-technical user guide |
| Backup & Restore | Done | CLI scripts (`backup-db.js`, `restore-db.js`) + admin web UI at `/backup`; create/download via browser, restore via CLI with guided instructions |
| Custom Design System | Done | CSS variable tokens; dark/light theme; `Icons.jsx`; `ui.jsx` primitives |
| UI Redesign (all pages) | Done | All pages restyled with design system; sidebar nav with sectioned layout |
| Theme Toggle | Done | Light/dark switcher in sidebar; localStorage persistence; flash-free init script |
| BookingDetail v2 | Done | Tabbed layout (Info / Finance / Docs); journey timeline; shipment hero card; Geist font |
| SSE Real-time | Done | `/api/events` SSE endpoint; `broadcast()` on booking mutations; `useSSE` hook auto-invalidates queries |
| Public Booking IDs | Done | `public_id` hex field; all API routes use public_id; migration 009 |
| Toast Notifications | Done | `Toast.jsx` + `useToast`; all mutations show success/error feedback |
| Skeleton Loaders | Done | `Skeleton.jsx`; BookingDetail uses skeleton while loading |
| PDF Export | Done | `exportBookingInvoice` + `exportInvoiceOnly`; invoice download in BookingDetail (finance+) |
| Booking Documents | Done | PEB & Phyto doc numbers, SI, invoice, pelunasan info; Docs tab in BookingDetail; migration 013 |
| PWA + HTTPS | Done | vite-plugin-pwa; HTTPS conditional on certs; gen-cert script; deploy on port 443 |
| DB Indexes | Done | `008_indexes.sql` performance indexes |
| Code Splitting | Done | All pages lazy-loaded via `React.lazy` + `Suspense` |

---

## In Progress / Planned

| Item | Priority | Notes |
|------|----------|-------|
| Invoice module | Medium | Generate printable invoice from booking; link piutang to invoice |
| Hutang filter by doc type / transporter | Low | Per reference docs |
| Piutang linked to customer | Low | Search by customer name |
| Status filter server-side | Low | Hutang/Piutang list status filter currently client-side; should be server-side for correct pagination |
| Production deployment | Low | Build client → server/public, env config |

---

## Known Issues / Tech Debt

- Status filter on Hutang/Piutang list pages done client-side (incorrect pagination when filtered)
