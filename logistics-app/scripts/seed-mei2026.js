#!/usr/bin/env node
'use strict';

// Run from repo root: node scripts/seed-mei2026.js
// Archives existing data then seeds real Buku Mei 2026 data.

import { DatabaseSync } from 'node:sqlite';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDir = join(__dirname, '..', 'server');
const dbPath    = join(serverDir, 'data', 'app.db');
const outDir    = join(serverDir, 'data');
const archivePath = join(outDir, 'archive-dump.json');

if (!existsSync(dbPath)) {
  console.error('DB not found:', dbPath);
  process.exit(1);
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const db = new DatabaseSync(dbPath);

// ── 1. Archive ────────────────────────────────────────────────────────────────

const dump = {
  archived_at: new Date().toISOString(),
  buku:        db.prepare('SELECT * FROM buku').all(),
  shippers:    db.prepare('SELECT * FROM shippers').all(),
  commodities: db.prepare('SELECT * FROM commodities').all(),
  bookings:    db.prepare('SELECT * FROM bookings').all(),
  containers:  db.prepare('SELECT * FROM containers').all(),
};
writeFileSync(archivePath, JSON.stringify(dump, null, 2));
console.log(`Archived ${dump.bookings.length} bookings → ${archivePath}`);

// ── 2. Wipe data (keep users) ─────────────────────────────────────────────────

db.exec('PRAGMA foreign_keys = OFF');

const WIPE_TABLES = [
  'audit_log', 'pembayaran', 'hutang', 'piutang', 'dokumen',
  'invoice_pajak_items', 'invoice_pajak',
  'nota_reimbursement_items', 'nota_reimbursement',
  'booking_documents',
  'containers', 'bookings', 'commodities', 'shippers', 'buku',
];

for (const t of WIPE_TABLES) {
  try { db.exec(`DELETE FROM ${t}`); } catch {}
  try { db.exec(`DELETE FROM sqlite_sequence WHERE name = '${t}'`); } catch {}
}

db.exec('PRAGMA foreign_keys = ON');
console.log('Wiped existing data (users kept).');

// ── 3. Static data ────────────────────────────────────────────────────────────

const SHIPPERS_DATA = [
  { name: 'OLAM',      commodity: 'COFFEE' },
  { name: 'SMART',     commodity: 'OIL' },
  { name: 'SJL',       commodity: null },
  { name: 'METROPOLE', commodity: 'FURNITURE' },
  { name: 'INAGRIN',   commodity: 'SAWDUST' },
  { name: 'ROYAL',     commodity: 'COFFEE' },
];

// job_no, shipper, port_discharge, containers: [{ count, size }]
const BOOKINGS_DATA = [
  { job_no: '29/V', shipper: 'OLAM',      port_discharge: 'YOKOHAMA',   containers: [{ count: 6,  size: '20ft' }] },
  { job_no: '31/V', shipper: 'SMART',     port_discharge: 'QINGDAO',    containers: [{ count: 6,  size: '20ft' }] },
  { job_no: '32/V', shipper: 'OLAM',      port_discharge: 'OAKLAND',    containers: [{ count: 1,  size: '20ft' }] },
  { job_no: '36/V', shipper: 'OLAM',      port_discharge: 'OAKLAND',    containers: [{ count: 1,  size: '20ft' }] },
  { job_no: '38/V', shipper: 'SMART',     port_discharge: 'QINGDAO',    containers: [{ count: 6,  size: '20ft' }] },
  { job_no: '39/V', shipper: 'SJL',       port_discharge: 'ULSAN',      containers: [{ count: 12, size: '20ft' }] },
  { job_no: '43/V', shipper: 'METROPOLE', port_discharge: 'DOHA',       containers: [{ count: 1,  size: '20ft' }] },
  { job_no: '44/V', shipper: 'INAGRIN',   port_discharge: 'GUANG YANG', containers: [{ count: 10, size: '40ft' }] },
  { job_no: '45/V', shipper: 'ROYAL',     port_discharge: 'HOUSTON',    containers: [{ count: 1,  size: '20ft' }] },
];

// ── 4. Seed ───────────────────────────────────────────────────────────────────

// Get first admin user id
const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
const adminId   = adminUser?.id ?? 1;

// Shippers + commodities
console.log('Seeding shippers...');
const shipperMap = {};
const stmtShipper   = db.prepare('INSERT INTO shippers (name) VALUES (?)');
const stmtCommodity = db.prepare('INSERT INTO commodities (shipper_id, name) VALUES (?, ?)');

for (const s of SHIPPERS_DATA) {
  const res = stmtShipper.run(s.name);
  shipperMap[s.name] = { id: res.lastInsertRowid, commodity: s.commodity };
  if (s.commodity) stmtCommodity.run(res.lastInsertRowid, s.commodity);
}

// Buku Mei 2026
console.log('Seeding buku...');
const stmtBuku = db.prepare('INSERT INTO buku (tahun, bulan, status, created_by) VALUES (?, ?, ?, ?)');
const bukuRes  = stmtBuku.run(2026, 5, 'open', adminId);
const bukuId   = bukuRes.lastInsertRowid;

// Bookings + containers
console.log('Seeding bookings...');
const stmtBooking   = db.prepare(`
  INSERT INTO bookings
    (public_id, job_no, shipper, commodity, port, port_discharge, status, buku_id, created_by, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const stmtContainer = db.prepare(
  'INSERT INTO containers (booking_id, container_no, seal_no, size, no_sp, trucking, biaya_trucking, in_date, out_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

const TRUCKING_VENDORS = ['MMC', 'TAS-T'];
const BIAYA_LIST = [1500000, 1750000, 2000000, 2250000, 2500000];
function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function addDays(base, n) {
  const d = new Date(base); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
const BASE_DATE = '2026-05-01';

const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
let contSerial = 1000000;

function randLetters(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return s;
}

for (const b of BOOKINGS_DATA) {
  const publicId  = randomBytes(16).toString('hex');
  const shipper   = shipperMap[b.shipper];
  const commodity = shipper.commodity ?? '';

  const res = stmtBooking.run(
    publicId, b.job_no, b.shipper, commodity,
    'Belawan', b.port_discharge,
    'in_progress', bukuId, adminId, now, now
  );
  const bookingId = res.lastInsertRowid;

  // Each booking gets its own 4-letter owner prefix (realistic ISO container format)
  const prefix = randLetters(4);

  for (const c of b.containers) {
    for (let i = 0; i < c.count; i++) {
      const no      = `${prefix}${contSerial}`;
      const seal    = `${randLetters(4)}${contSerial}`;
      const noSp    = `SP/${b.job_no.replace('/', '-')}/${String(i + 1).padStart(3, '0')}`;
      const vendor  = randItem(TRUCKING_VENDORS);
      const biaya   = randItem(BIAYA_LIST);
      const inDate  = addDays(BASE_DATE, Math.floor(Math.random() * 20));
      const outDate = addDays(inDate, 1 + Math.floor(Math.random() * 3));
      stmtContainer.run(bookingId, no, seal, c.size, noSp, vendor, biaya, inDate, outDate, '', now);
      contSerial++;
    }
  }
}

db.close();
console.log(`Done. Seeded ${BOOKINGS_DATA.length} bookings in Buku Mei 2026.`);
