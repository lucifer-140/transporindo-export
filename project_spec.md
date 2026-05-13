# Project Spec — Transporindo Export TAS

## Purpose

Internal admin system for PT Transporindo Export. Manages export logistics job orders, associated documents, and company financials (accounts payable/receivable).

## User Roles

| Role   | Capabilities |
|--------|-------------|
| admin  | Full access: bookings, dokumen, hutang, piutang, users, audit log |
| worker | Bookings, dokumen, hutang, piutang (no user management, no audit log) |

## Modules

### 1. Bookings (Job Orders)

Core entity. Represents one export job/shipment.

**Fields:**
- `job_no` — unique job reference number (required)
- `shipper` — exporter name (required)
- `peb` — Pemberitahuan Ekspor Barang number
- `port` — departure port
- `feeder` — feeder vessel
- `vessel_name` / `vessel_no` — ocean vessel
- `bon` — BON number
- `in_date` / `out_date` — container in/out dates
- `trucking` — trucking vendor
- `notes` — free text
- `status` — `in_progress` | `done`

**Behavior:**
- Soft-delete via `deleted_at`
- List supports full-text search (job_no, shipper, peb, bon, vessel, container_no)
- CSV export with date range filter

### 2. Containers

Child of Booking. Multiple containers per booking.

**Fields:** `container_no`, `seal_no`, `size` (20ft / 40ft)

Derived `qty` field displayed on booking list (e.g., "2x20, 1x40").

### 3. Dokumen

Expense documents attached to a booking (PEB, COO, ICO, etc.).

**Fields:** `tipe` (document type), `no_dokumen`, `biaya` (cost in IDR)

Used as source for auto-filling piutang amount.

### 4. Hutang (Accounts Payable)

Money owed to vendors/transporters.

**Fields:** `pihak` (vendor name), `jumlah` (amount IDR), `keterangan`, `booking_id` (optional link)

**Payment tracking:** multiple `pembayaran` entries per hutang (tanggal, jumlah, keterangan)

**Derived status:** `belum_bayar` | `sebagian` | `lunas`

### 5. Piutang (Accounts Receivable)

Money owed by clients per booking. One piutang per booking.

**Fields:** `jumlah` (total tagihan IDR), `keterangan`

**Auto-fill:** sum of dokumen.biaya for the booking

**Payment tracking:** multiple `pembayaran` entries per piutang

**Derived status:** `belum_bayar` | `sebagian` | `lunas`

### 6. Users

**Fields:** `username`, `password_hash`, `full_name`, `role`, `active`

Admin can create, activate/deactivate users. Password min 8 chars (bcrypt hashed).

### 7. Audit Log

Immutable record of all mutations. Records: `user_id`, `action`, `entity_type`, `entity_id`, `changes` (JSON).

## Database Schema (SQLite, WAL mode)

```
users          — id, username, password_hash, full_name, role, active, created_at
bookings       — id, job_no, shipper, peb, port, feeder, vessel_name, vessel_no, bon,
                 in_date, out_date, trucking, notes, status, created_by, deleted_at,
                 created_at, updated_at
containers     — id, booking_id->bookings, container_no, seal_no, size
dokumen        — id, booking_id->bookings, tipe, no_dokumen, biaya, created_by, created_at
piutang        — id, booking_id->bookings (UNIQUE), jumlah, keterangan, created_by, created_at
hutang         — id, booking_id->bookings (nullable), pihak, keterangan, jumlah, created_by, created_at
pembayaran     — id, entity_type (piutang|hutang), entity_id, jumlah, tanggal, keterangan, created_by, created_at
audit_log      — id, user_id, action, entity_type, entity_id, changes, timestamp
sessions       — sid, sess, expired
```

## Tech Stack

- **Runtime:** Node.js >= 20
- **Backend:** Fastify 5, better-sqlite3, @fastify/session, @fastify/cookie, @fastify/cors, @fastify/static, Zod
- **Frontend:** React 19, React Router v6, TanStack Query v5, Axios, TailwindCSS v4, Vite
- **Auth:** Session cookie (httpOnly, sameSite=lax, 8h TTL)

## Planned (Not Yet Implemented)

- Customer entity (replace raw shipper text field)
- Invoice module (generate invoice from booking, link to piutang)
- Piutang linked to customer (search by customer name)
- Hutang filter by document type / transporter
- Real session auth enforcement on all routes (currently STUB_USER_ID=1)
