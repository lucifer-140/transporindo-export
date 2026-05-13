# Transporindo Export — TAS (Transport Admin System)

Internal logistics management system for PT Transporindo Export. Handles job order (booking) management, document tracking, and accounts payable/receivable (hutang & piutang).

## Tech Stack

| Layer    | Tech                                      |
|----------|-------------------------------------------|
| Backend  | Node.js, Fastify, SQLite (better-sqlite3) |
| Frontend | React 19, Vite, TailwindCSS v4            |
| State    | TanStack Query v5                         |
| Auth     | Session-based (fastify-session, httpOnly cookie) |

## Project Structure

```
logistics-app/
  server/       — Fastify REST API, port 8080
  client/       — React + Vite SPA, port 5173
scripts/        — CLI utilities
docs/           — Architecture, changelog, status
```

## Getting Started

### Prerequisites
- Node.js >= 20

### Server

```bash
cd logistics-app/server
cp .env.example .env          # configure environment
npm install
npm run migrate               # create/migrate database
npm run dev                   # start with hot reload
```

### Client

```bash
cd logistics-app/client
npm install
npm run dev                   # Vite dev server (proxies /api → :8080)
```

### Seed First Admin

```bash
node scripts/seed-admin.js <username> <password>
```

## Environment Variables

See `logistics-app/server/.env.example`. Key variables:

| Variable         | Description                        | Default              |
|------------------|------------------------------------|----------------------|
| `PORT`           | Server port                        | `8080`               |
| `SESSION_SECRET` | Secret for signing session cookies | —                    |
| `DB_PATH`        | SQLite database file path          | `./data/app.db`      |
| `NODE_ENV`       | `development` or `production`      | `development`        |

## Features

- **Job Orders (Bookings)** — Create and manage export bookings with vessel, port, feeder, and BON details
- **Containers** — Track container numbers, seal numbers, and sizes per booking
- **Dokumen** — Attach expense documents (PEB, COO, ICO, etc.) with costs per booking
- **Hutang (AP)** — Track amounts owed to vendors/transporters with full payment history
- **Piutang (AR)** — Track receivables per booking with payment history and auto-fill from dokumen costs
- **Users** — Admin and worker roles; admin gates user management and audit log
- **Audit Log** — Immutable log of all create/update/delete actions

## API Overview

Base URL: `http://localhost:8080/api`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| GET | `/bookings` | List bookings (filter: q, status, from, to, page) |
| POST | `/bookings` | Create booking |
| GET | `/bookings/:id` | Get booking detail |
| PUT | `/bookings/:id` | Update booking |
| DELETE | `/bookings/:id` | Soft-delete booking |
| GET | `/bookings/:id/dokumen` | List dokumen |
| POST | `/bookings/:id/dokumen` | Add dokumen |
| GET | `/bookings/:id/piutang` | Get piutang for booking |
| POST | `/bookings/:id/piutang` | Create piutang |
| POST | `/bookings/:id/piutang/:id/pembayaran` | Add payment to piutang |
| GET | `/hutang` | List all hutang |
| POST | `/hutang` | Create hutang |
| POST | `/hutang/:id/pembayaran` | Add payment to hutang |
| GET | `/users` | List users (admin only) |
| GET | `/audit` | Audit log (admin only) |
| GET | `/finance/summary` | Finance aggregate summary |

## Roles

| Role    | Access |
|---------|--------|
| `admin` | Full access including user management and audit log |
| `worker`| Bookings, dokumen, hutang, piutang |

## Docs

- [Project Spec](project_spec.md)
- [Architecture](docs/architecture.md)
- [Changelog](docs/changelog.md)
- [Project Status](docs/project_status.md)
