# Project Status

**Version:** 0.5.0
**Last Updated:** 2026-05-13
**Stage:** Active Development

---

## Completed

| Module | Status | Notes |
|--------|--------|-------|
| Shippers & Commodities | Done | Master data management; commodities linked to shipper; smart auto-fill in booking form |
| Bookings CRUD | Done | Soft-delete, search, CSV export, shipper/commodity fields |
| Containers | Done | Multi-container per booking, derived qty |
| Invoice (was Dokumen) | Done | Line items: Uraian/Qty/Harga Satuan/Jumlah; total row; replaces flat dokumen section |
| Users + Roles | Done | admin/worker, bcrypt, activate/deactivate |
| Audit Log | Done | Read-only, paginated |
| Session Auth | Partial | Backend endpoints work; client hooks are stubs (STUB_USER_ID=1) |
| Hutang (AP) | Done | CRUD, optional booking link, payment history, metode field, derived status |
| Piutang (AR) | Done | Per-booking, auto-fill from invoice total, payment history, metode field, derived status |
| Finance Summary | Done | `/api/finance/summary` aggregate |
| Dedicated Finance Pages | Done | `/piutang` and `/hutang` pages with filters |

---

## In Progress / Planned

| Item | Priority | Notes |
|------|----------|-------|
| Real auth enforcement | High | Wire `requireAuth` to all routes; replace STUB_USER_ID with `request.session.user.id` |
| Invoice module | Medium | Generate invoice from booking; link piutang to invoice |
| Hutang filter by doc type / transporter | Low | Per reference docs |
| Piutang linked to customer | Low | Search by customer name |
| Production deployment | Low | Build client → server/public, env config |

---

## Known Issues / Tech Debt

- `STUB_USER_ID = 1` hardcoded in all route handlers — auth not enforced yet
- Client `useAuth` / `useLogin` / `useLogout` hooks are stubs — login page does nothing
- `requireAuth` and `requireRole` middleware defined but not applied to routes
- Status filter on Hutang/Piutang list pages done client-side (should be server-side for correct pagination)
