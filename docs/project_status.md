# Project Status

**Version:** 0.8.0
**Last Updated:** 2026-05-15
**Stage:** Active Development

---

## Completed

| Module | Status | Notes |
|--------|--------|-------|
| Buku (Monthly Ledger) | Done | YYYY/MM ledger; bookings belong to a buku; BukuList home page; BukuDetail with shipper breakdown + piutang totals; auto-refresh 15s |
| Shippers & Commodities | Done | Master data management; commodities linked to shipper; smart auto-fill in booking form |
| Bookings CRUD | Done | Soft-delete, search, CSV export, shipper/commodity fields; buku-first creation flow |
| Containers | Done | Multi-container per booking, derived qty |
| Invoice (was Dokumen) | Done | Line items: Uraian/Qty/Harga Satuan/Jumlah; total row |
| Users + Roles | Done | admin/finance/worker; bcrypt; edit (full_name, role, password); delete with confirm |
| Audit Log | Done | Read-only, paginated; admin-only access |
| Session Auth | Done | Real login/logout; useAuth fetches /api/auth/me; 401 interceptor redirects to /login |
| RBAC — Route Protection | Done | requireRole(minRole) on all server routes; ProtectedRoute on all client routes |
| RBAC — Role Hierarchy | Done | worker < finance < admin; finance role accesses all finance pages |
| Hutang (AP) | Done | CRUD, optional booking link, payment history, metode field, derived status |
| Piutang (AR) | Done | Per-booking, auto-fill from invoice total, payment history, metode field, derived status |
| Finance Summary | Done | `/api/finance/summary` aggregate; finance+ access only |
| BukuFinance page | Done | Finance view per buku; accessible to finance and admin roles |
| System Flow Doc | Done | `docs/system-flow.md` — non-technical user guide |
| Custom Design System | Done | CSS variable tokens; dark/light theme; `Icons.jsx`; `ui.jsx` primitives |
| UI Redesign (all pages) | Done | All pages restyled with design system; sidebar nav with sectioned layout |

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
