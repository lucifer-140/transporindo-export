# Project Status

**Current version:** v0.11.0 (unreleased patch in progress)  
**Last updated:** 2026-05-16

---

## What's Working

### Core
- Booking CRUD with soft delete, containers, public IDs
- Buku (monthly ledger) with status tracking and closed-buku guard
- 3-role auth: admin / finance / worker (session cookie, httpOnly)
- SSE real-time updates on booking changes

### Finance
- Invoice line items (dokumen): description, qty, unit price, subtotal
- Piutang (receivables): per-booking, with multi-payment support (cash/transfer/giro)
- Hutang (payables): per-booking or vendor-level, with payments
- BukuFinance: per-shipper summary with PDF export

### UX
- BukuList → BukuDetail → BookingDetail navigation
- Year filter tabs in BukuDetail
- Master-detail shipper view with inline booking search
- Light/dark theme toggle
- Toast notifications
- PDF export (booking invoice + shipper monthly invoice)

---

## In Progress

- **Invoice Pajak** — tax invoice per booking with line items, PPN calculation (11% default, admin-configurable)
- **Nota Reimbursement** — reimbursement note per booking with qty/price line items
- **Settings page** — admin UI to configure PPN rate
- **Money format** — changing to `Rp. 1,400,890.00` (Western locale, 2 decimal places)
- Reconciliation warning: Invoice Pajak total + Reimbursement total must equal Invoice tab total

---

## Planned / Backlog

- PDF export for Invoice Pajak and Nota Reimbursement
- Role: `finance` can view all buku; currently inherits from worker
- Pagination on BukuDetail booking list (stress test at 100 bookings/shipper)

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Fastify, SQLite (better-sqlite3), WAL mode |
| Frontend | React 19, Vite, TailwindCSS v4 |
| State | TanStack Query v5, axios |
| Auth | Session cookie (httpOnly), @fastify/session |
| PDF | jsPDF + jspdf-autotable |
| Dev | node --watch (server), Vite HMR (client) |
