# Project Status

**Version:** 0.3.0
**Last Updated:** 2026-05-13
**Stage:** Active Development

---

## Completed

| Module | Status | Notes |
|--------|--------|-------|
| Bookings CRUD | Done | Soft-delete, search, CSV export |
| Containers | Done | Multi-container per booking, derived qty |
| Dokumen | Done | Inline in BookingDetail |
| Users + Roles | Done | admin/worker, bcrypt, activate/deactivate |
| Audit Log | Done | Read-only, paginated |
| Session Auth | Partial | Backend endpoints work; client hooks are stubs (STUB_USER_ID=1) |
| Hutang (AP) | Done | CRUD, optional booking link, payment history, derived status |
| Piutang (AR) | Done | Per-booking, auto-fill from dokumen, payment history, derived status |
| Finance Summary | Done | `/api/finance/summary` aggregate |
| Dedicated Finance Pages | Done | `/piutang` and `/hutang` pages with filters |

---

## In Progress / Planned

| Item | Priority | Notes |
|------|----------|-------|
| Real auth enforcement | High | Wire `requireAuth` to all routes; replace STUB_USER_ID with `request.session.user.id` |
| Customer entity | Medium | Replace raw `shipper` text with a proper Customer table (CRUD, searchable) |
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
