# Logistics Booking Webapp — Complete Plan

A local-network CRUD webapp for managing export bookings (Bookingan). Runs on a single Windows 11 PC, accessed by office workers via LAN.

---

## 1. Project Overview

**What it does:** Workers enter and manage export booking records — job number, shipper, containers, vessel info, PEB, Bon, etc.

**Where it runs:** One Windows 11 PC in the office acts as the server. Everyone else opens a browser and goes to `http://192.168.x.x:8080`.

**Who uses it:** Office workers (data entry) + 1–2 admins (manage users, view all data, exports).

**Scale assumption:** 5–20 concurrent users, hundreds to a few thousand bookings/year. SQLite handles this comfortably.

---

## 2. Tech Stack

| Layer        | Choice                          | Why                                                |
|--------------|---------------------------------|----------------------------------------------------|
| Runtime      | Node.js 20 LTS                  | Stable, runs cleanly on Windows                    |
| Web framework| Fastify                         | Faster + cleaner than Express, built-in validation |
| Database     | SQLite via `better-sqlite3`     | Single file, no DB server, very fast for this scale|
| Auth         | `@fastify/session` + bcrypt     | Session cookies, hashed passwords                  |
| Validation   | Zod                             | Type-safe input validation                         |
| Logging      | Pino                            | Built into Fastify, structured JSON logs           |
| Frontend     | React 18 + Vite                 | Standard, fast dev experience                      |
| UI styling   | Tailwind CSS                    | Quick to build clean tables/forms                  |
| Data fetching| TanStack Query                  | Caching + auto-refresh for tables                  |
| HTTPS (local)| `mkcert`                        | Locally-trusted cert, no browser warnings          |
| Process mgmt | NSSM                            | Run Node as a Windows Service                      |

---

## 3. Project Structure

```
logistics-app/
├── server/
│   ├── src/
│   │   ├── index.js              # Fastify entry point
│   │   ├── db.js                 # SQLite connection + migrations runner
│   │   ├── migrations/
│   │   │   ├── 001_init.sql
│   │   │   └── 002_audit_log.sql
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── bookings.js
│   │   │   ├── containers.js
│   │   │   └── users.js
│   │   ├── middleware/
│   │   │   ├── requireAuth.js
│   │   │   └── requireRole.js
│   │   ├── schemas/              # Zod schemas
│   │   │   └── booking.js
│   │   └── utils/
│   │       ├── audit.js
│   │       └── password.js
│   ├── data/
│   │   ├── app.db                # SQLite database (gitignored)
│   │   └── backups/              # Auto-backups land here
│   ├── public/                   # Built React app goes here
│   ├── certs/                    # Local HTTPS cert + key
│   ├── package.json
│   └── .env
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── BookingsList.jsx
│   │   │   ├── BookingForm.jsx
│   │   │   ├── BookingDetail.jsx
│   │   │   └── Users.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── DataTable.jsx
│   │   │   └── ContainerInputRow.jsx
│   │   ├── api/
│   │   │   └── client.js
│   │   └── hooks/
│   │       └── useAuth.js
│   ├── vite.config.js
│   └── package.json
├── scripts/
│   ├── backup.ps1                # Scheduled SQLite backup
│   ├── install-service.ps1       # Register Node as Windows Service
│   └── seed-admin.js             # Create first admin user
└── README.md
```

---

## 4. Database Schema

```sql
-- 001_init.sql

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'worker',   -- 'admin' | 'worker'
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  job_no        TEXT NOT NULL,                    -- "12/X"
  shipper       TEXT NOT NULL,                    -- "Metropole"
  peb           TEXT,                             -- Pemberitahuan Ekspor Barang
  port          TEXT,                             -- "Oakland"
  feeder        TEXT,                             -- "Evergreen" / "OOCL" / "ONE"
  vessel_name   TEXT,                             -- "Integra"
  vessel_no     TEXT,                             -- "V. 158E"
  bon           TEXT,                             -- "006316/006317"
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending|in_progress|shipped|completed
  notes         TEXT,
  created_by    INTEGER REFERENCES users(id),
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE containers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id    INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  container_no  TEXT NOT NULL,                    -- "FFAU6615812"
  seal_no       TEXT,                             -- "IDA745316"
  size          TEXT NOT NULL,                    -- "20" or "40"
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER REFERENCES users(id),
  action        TEXT NOT NULL,                    -- 'create'|'update'|'delete'
  entity_type   TEXT NOT NULL,                    -- 'booking'|'container'|'user'
  entity_id     INTEGER,
  changes       TEXT,                             -- JSON diff
  timestamp     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for the searches workers will actually run
CREATE INDEX idx_bookings_job_no     ON bookings(job_no);
CREATE INDEX idx_bookings_shipper    ON bookings(shipper);
CREATE INDEX idx_bookings_status     ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX idx_containers_no       ON containers(container_no);
CREATE INDEX idx_containers_booking  ON containers(booking_id);

-- Auto-update updated_at on bookings
CREATE TRIGGER bookings_updated_at AFTER UPDATE ON bookings
BEGIN
  UPDATE bookings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

### Why containers are a separate table

Your `qty` field ("1x20", "4x40") describes how many containers and what size. Instead of storing this as free text, derive it from the actual containers attached to a booking:

- A booking with one 20ft container → qty displays as "1x20"
- A booking with three 40ft containers → qty displays as "3x40"
- Mixed: "2x20, 1x40"

This makes container numbers searchable (workers will absolutely need this — "which booking has container FFAU6615812?") and prevents typos in the qty field from getting out of sync with reality.

---

## 5. API Endpoints

All routes are JSON. All except `/auth/login` require a valid session cookie.

### Auth
```
POST   /api/auth/login          { username, password } → { user }
POST   /api/auth/logout         → 204
GET    /api/auth/me             → { user } or 401
```

### Bookings
```
GET    /api/bookings            ?q=&status=&from=&to=&page=&limit=
                                 → { rows, total }
GET    /api/bookings/:id        → { booking, containers }
POST   /api/bookings            { job_no, shipper, peb, port, feeder,
                                  vessel_name, vessel_no, bon, notes,
                                  containers: [{container_no, seal_no, size}] }
                                 → { booking, containers }
PUT    /api/bookings/:id        (same payload) → updated record
PATCH  /api/bookings/:id/status { status } → updated record
DELETE /api/bookings/:id        → 204 (admin only)
```

### Containers (nested under bookings)
```
POST   /api/bookings/:id/containers      { container_no, seal_no, size }
PUT    /api/containers/:id               { container_no, seal_no, size }
DELETE /api/containers/:id               → 204
```

### Users (admin only)
```
GET    /api/users
POST   /api/users               { username, password, full_name, role }
PUT    /api/users/:id           { full_name, role, active }
POST   /api/users/:id/password  { new_password }
```

### Export
```
GET    /api/bookings/export     ?format=csv&from=&to=  → CSV download
```

### Sample request/response

**POST /api/bookings**
```json
{
  "job_no": "12/X",
  "shipper": "Metropole",
  "peb": "000123-2025",
  "port": "Oakland",
  "feeder": "Evergreen",
  "vessel_name": "Integra",
  "vessel_no": "V. 158E",
  "bon": "006316/006317",
  "notes": "",
  "containers": [
    { "container_no": "FFAU6615812", "seal_no": "IDA745316", "size": "20" }
  ]
}
```

**Response 201**
```json
{
  "booking": {
    "id": 47,
    "job_no": "12/X",
    "shipper": "Metropole",
    "qty": "1x20",
    "status": "pending",
    "created_at": "2026-05-12T03:14:22Z",
    "...": "..."
  },
  "containers": [
    { "id": 92, "container_no": "FFAU6615812", "seal_no": "IDA745316", "size": "20" }
  ]
}
```

---

## 6. Frontend Pages

| Route                   | Page             | Who can access      |
|-------------------------|------------------|---------------------|
| `/login`                | Login            | Public              |
| `/`                     | Bookings list    | Worker + Admin      |
| `/bookings/new`         | New booking form | Worker + Admin      |
| `/bookings/:id`         | Booking detail   | Worker + Admin      |
| `/bookings/:id/edit`    | Edit booking     | Worker + Admin      |
| `/users`                | User management  | Admin only          |
| `/audit`                | Audit log        | Admin only          |

### Bookings list — what it shows

A table with: No, Job, Shipper, Qty, Port, Feeder, Vessel, Container No (first one + "+N more"), Status, Created.

Above the table:
- Search bar (matches job_no, shipper, container_no, peb, bon, vessel_name)
- Status filter dropdown
- Date range filter
- "New Booking" button

Click a row → detail page. Detail page has Edit / Delete (admin) / Change Status buttons.

### New/Edit booking form

Top section — booking fields:
- Job No, Shipper, PEB, Port, Feeder, Vessel Name, Vessel No, Bon, Notes

Bottom section — Containers (dynamic rows):
- Each row: Container No, Seal No, Size (20/40 dropdown), Remove button
- "+ Add Container" button at the bottom
- Qty is auto-calculated and displayed (e.g. "1x20" or "2x20, 1x40")

Validation rules (Zod, enforced both client + server):
- `job_no`: required, non-empty
- `shipper`: required, non-empty
- `container_no`: required if row exists, recommended format `^[A-Z]{4}[0-9]{7}$` (ISO 6346) — warn but don't block, since real-world data sometimes deviates
- `size`: must be "20" or "40"

---

## 7. Authentication & Authorization

**Flow:**
1. Worker visits any page → if no session, redirect to `/login`
2. `POST /api/auth/login` checks bcrypt hash, sets HTTP-only session cookie
3. Cookie is signed (server-side secret) + HTTP-only + SameSite=Lax + Secure (HTTPS)
4. Session stored server-side in SQLite (`sessions` table via `@fastify/session`)
5. Logout clears session

**Roles:**
- `worker`: full CRUD on bookings, can see all bookings
- `admin`: everything worker can do + manage users + delete bookings + view audit log

**Password rules:**
- Min 8 chars
- bcrypt cost factor 12
- No rotation requirement (it's a small office, not a bank — overly strict rules just lead to sticky notes on monitors)

**First admin:**
Run `node scripts/seed-admin.js` once to create the initial admin. Prompts for username and password.

---

## 8. Development Setup

### One-time setup on dev machine

```bash
# Install Node 20 LTS, then:
git clone <repo>
cd logistics-app

# Server
cd server
npm install
node scripts/seed-admin.js     # creates first admin
npm run migrate
npm run dev                    # starts on :8080

# Client (new terminal)
cd client
npm install
npm run dev                    # Vite dev server on :5173, proxies /api to :8080
```

### Building for production

```bash
cd client
npm run build                  # outputs to ../server/public

cd ../server
npm run build                  # if you add any build step (e.g. esbuild bundling)
```

Now the server alone serves both the API and the built React app.

---

## 9. Deployment on the Windows 11 Host

### One-time host setup

1. **Install Node 20 LTS** on the host PC
2. **Set a static LAN IP** in Windows network settings (e.g. 192.168.1.50). Confirm it survives reboots.
3. **Disable sleep** in Power Options. Set "When plugged in, PC goes to sleep" to Never.
4. **Generate local HTTPS cert** with `mkcert`:
   ```
   mkcert -install
   mkcert 192.168.1.50 localhost
   # move the .pem files into server/certs/
   ```
5. **Configure Windows Firewall** — allow inbound TCP 8080 (or 443 if you map it) from the local subnet only:
   ```powershell
   New-NetFirewallRule -DisplayName "Logistics App" `
     -Direction Inbound -Protocol TCP -LocalPort 8080 `
     -RemoteAddress 192.168.1.0/24 -Action Allow
   ```
6. **Copy the app** to `C:\apps\logistics-app\` and run `npm install --production`
7. **Install as Windows Service** using NSSM:
   ```
   nssm install LogisticsApp "C:\Program Files\nodejs\node.exe" "C:\apps\logistics-app\server\src\index.js"
   nssm set LogisticsApp AppDirectory "C:\apps\logistics-app\server"
   nssm set LogisticsApp AppStdout "C:\apps\logistics-app\logs\out.log"
   nssm set LogisticsApp AppStderr "C:\apps\logistics-app\logs\err.log"
   nssm start LogisticsApp
   ```
8. **Test from another machine** on the same network: `https://192.168.1.50:8080`

### .env on host

```
NODE_ENV=production
PORT=8080
SESSION_SECRET=<generate a long random string>
DB_PATH=C:/apps/logistics-app/server/data/app.db
HTTPS_CERT=C:/apps/logistics-app/server/certs/192.168.1.50.pem
HTTPS_KEY=C:/apps/logistics-app/server/certs/192.168.1.50-key.pem
```

### Worker machines

Nothing to install. Just bookmark `https://192.168.1.50:8080` in their browser. Works on Windows, macOS, Linux, phones, tablets.

If you didn't use `mkcert -install` on each client (you can't, easily), workers will see a cert warning once and have to accept it. Acceptable for an internal tool. If you want zero warnings, distribute the mkcert root CA cert to each client.

---

## 10. Backup Strategy

**This is the single most important thing.** Your entire business sits in `app.db`.

### Three layers

**Layer 1: Local automated backup (daily)**

`scripts/backup.ps1` runs daily via Windows Task Scheduler at 11 PM:

```powershell
$date = Get-Date -Format "yyyy-MM-dd_HHmm"
$src  = "C:\apps\logistics-app\server\data\app.db"
$dst  = "C:\apps\logistics-app\server\data\backups\app_$date.db"

# Use SQLite's .backup command, not file copy — safe while DB is in use
& "C:\sqlite\sqlite3.exe" $src ".backup '$dst'"

# Keep last 30 days, delete older
Get-ChildItem "C:\apps\logistics-app\server\data\backups\app_*.db" |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
  Remove-Item
```

**Layer 2: Off-site sync**

Install OneDrive, Dropbox, or Google Drive on the host. Point it at the `backups/` folder. Every nightly backup gets copied to the cloud automatically. If the office PC is stolen/dies/floods, the data survives.

**Layer 3: Manual quarterly export**

Once a quarter, an admin clicks "Export CSV" and saves the dump somewhere separate. Belt-and-suspenders insurance against silent corruption.

### Test the restore

Once, before going live, copy a backup file to a different machine, point a fresh app at it, and confirm everything loads. **An untested backup is not a backup.**

---

## 11. Implementation Phases

### Phase 1 — Foundation (3–5 days)
- Project scaffold (server + client)
- SQLite + migration runner
- Auth (login, logout, session, bcrypt)
- Login page
- Layout shell + protected routes
- Seed admin script
- One-line "hello" page after login to prove auth works end-to-end

### Phase 2 — Bookings CRUD (5–7 days)
- Bookings list page (no search yet, just paginated table)
- New booking form (without containers first)
- Edit + delete
- Detail page
- Audit log writes on every change

### Phase 3 — Containers + Search (3–5 days)
- Containers sub-form (dynamic rows in new/edit page)
- Auto-derive `qty` for display
- Search bar (matches across job, shipper, container_no, peb, bon, vessel)
- Status + date filters
- CSV export

### Phase 4 — Admin + Polish (3–4 days)
- User management page (admin)
- Audit log viewer (admin)
- Form validation polish
- Empty states, error toasts
- Print-friendly booking detail page (workers love this)

### Phase 5 — Deployment (1–2 days)
- mkcert + HTTPS
- NSSM service install
- Firewall rules
- Backup script + Task Scheduler
- Test from worker machines
- Write a one-page printed cheat sheet for workers

**Total estimate: 3–4 weeks of focused work** for a single developer building this fresh.

---

## 12. Future Enhancements (don't build in v1)

When workers start asking for these, you'll know it's time:

- **Lookup tables for Shipper, Feeder, Port** — autocomplete + consistency (so "Evergreen" and "evergreen" don't both exist)
- **PDF generation** for booking confirmations / invoices (use `pdfkit` or `puppeteer`)
- **Invoice module** as a separate entity, linked to bookings
- **File attachments** — scan PEB docs, attach to booking (store on disk, path in DB)
- **Reports dashboard** — bookings by month, by shipper, by feeder
- **Email notifications** when status changes (only if office has SMTP)
- **2FA for admins**
- **Multi-tenant** — if you decide to sell this to other logistics companies later, this is where it gets harder. Plan now, but don't build yet.
- **Migrate SQLite → PostgreSQL** if you cross ~50 concurrent users or DB grows past a few GB

---

## 13. Risks & Mitigations

| Risk                                     | Mitigation                                                   |
|------------------------------------------|--------------------------------------------------------------|
| Host PC dies → business stops            | Daily backup + tested restore + spare PC plan                |
| Power outage corrupts DB                 | UPS battery + SQLite WAL mode (it's pretty resilient)        |
| Worker accidentally deletes a booking    | Soft delete (add `deleted_at` column) instead of hard delete |
| Someone shares their password            | Audit log catches it; periodic review                        |
| Office network gets infected with malware| The app PC isn't special — same antivirus + patching as any  |
| Developer leaves, no one knows the code  | Write a `MAINTENANCE.md`, keep deps minimal, comment heavily |

---

## 14. Open Questions for You

Before starting Phase 1, decide:

1. **Who's the first admin?** (Name + initial password — for the seed script)
2. **Static IP on the host** — what will it be? (e.g. 192.168.1.50)
3. **Port** — 8080 fine, or do you want 443?
4. **Status values** — is `pending → in_progress → shipped → completed` the right flow? Anything missing (e.g. `cancelled`, `on_hold`)?
5. **Do bookings ever need to be soft-deleted vs hard-deleted?** (I'd recommend soft delete for audit trail)
6. **Cloud backup destination** — OneDrive, Google Drive, Dropbox, or local NAS?
7. **Any other fields** workers will inevitably ask for once they start using it? (ETD, ETA, weight, commodity?)
