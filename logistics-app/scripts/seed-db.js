#!/usr/bin/env node
'use strict';

// Run from repo root: node scripts/seed-db.js
// Uses Node built-in SQLite (node:sqlite) — same as server

import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDir  = join(__dirname, '..', 'server');
const dbPath     = join(serverDir, 'data', 'app.db');

// bcrypt lives in server/node_modules
const require = createRequire(import.meta.url);
const bcrypt  = require(join(serverDir, 'node_modules', 'bcrypt'));

// ── helpers ──────────────────────────────────────────────────────────────────

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rndInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pad(n, w = 2) { return String(n).padStart(w, '0'); }
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function randomDate(year, month) {
  return `${year}-${pad(month)}-${pad(rndInt(1, 28))}`;
}

// ── static data ───────────────────────────────────────────────────────────────

const USERS = [
  { username: 'admin',    password: 'admin1234',   role: 'admin',   full_name: 'Administrator' },
  { username: 'finance1', password: 'finance1234', role: 'finance', full_name: 'Budi Santoso' },
  { username: 'worker1',  password: 'worker1234',  role: 'worker',  full_name: 'Andi Pratama' },
  { username: 'worker2',  password: 'worker1234',  role: 'worker',  full_name: 'Sari Dewi' },
  { username: 'manager',  password: 'manager1234', role: 'admin',   full_name: 'Riko Hendra' },
];

const SHIPPERS = [
  { name: 'PT Maju Jaya Ekspor',      commodities: ['Textiles', 'Garments'] },
  { name: 'CV Global Nusantara',      commodities: ['Electronics', 'Spare Parts'] },
  { name: 'PT Sinar Abadi',           commodities: ['Palm Oil', 'Coal'] },
  { name: 'PT Karya Mandiri',         commodities: ['Furniture', 'Wood Products'] },
  { name: 'CV Bintang Timur',         commodities: ['Chemicals', 'Fertilizer'] },
  { name: 'PT Indo Makmur',           commodities: ['Rice', 'Coffee Beans'] },
  { name: 'PT Samudra Logistics',     commodities: ['Steel', 'Iron Ore'] },
  { name: 'CV Nusa Perdana',          commodities: ['Rubber', 'Latex'] },
  { name: 'PT Cahaya Ekspres',        commodities: ['Seafood', 'Frozen Goods'] },
  { name: 'CV Mitra Bahari',          commodities: ['Cocoa', 'Spices'] },
  { name: 'PT Angkasa Raya',          commodities: ['Machinery', 'Equipment'] },
  { name: 'CV Tirta Kencana',         commodities: ['Crude Oil', 'Lubricants'] },
];

const PORTS    = ['Tanjung Priok', 'Tanjung Perak', 'Belawan', 'Makassar', 'Semarang'];
const VESSELS  = ['MV Ocean Star', 'KM Nusantara Jaya', 'MV Pacific Glory', 'KM Bahari Indah',
                  'MV Asian Express', 'KM Selat Malaka', 'MV Horizon Bay', 'KM Timur Raya'];
const TRUCKING = ['CV Cepat Laju', 'PT Kargo Nusa', 'UD Truk Jaya', 'CV Mitra Trans', 'PT Angkut Cepat'];
const DOK_TYPES = ['THC', 'B/L Fee', 'Admin Fee', 'Trucking', 'Storage', 'Seal Fee'];
const HUTANG_PIHAK = ['CV Cepat Laju', 'PT Kargo Nusa', 'Pelindo II', 'Biro Jasa Priok', 'UD Forwarder Jaya'];
const SIZES    = ['20ft', '40ft', 'HC'];
const METHODS  = ['transfer', 'cash', 'giro'];

function buildBukuList() {
  const list = [];
  for (let m = 1; m <= 12; m++) list.push({ tahun: 2024, bulan: m, status: 'closed' });
  for (let m = 1; m <= 10; m++) list.push({ tahun: 2025, bulan: m, status: 'closed' });
  for (let m = 11; m <= 12; m++) list.push({ tahun: 2025, bulan: m, status: 'open' });
  for (let m = 1;  m <= 5;  m++) list.push({ tahun: 2026, bulan: m, status: 'open' });
  return list;
}

// ── open DB & wipe ────────────────────────────────────────────────────────────

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = OFF');
db.exec('PRAGMA journal_mode = WAL');

const tables = ['audit_log', 'pembayaran', 'hutang', 'piutang', 'dokumen',
                'containers', 'bookings', 'commodities', 'shippers', 'buku',
                'sessions', 'users'];
for (const t of tables) {
  try { db.exec(`DELETE FROM ${t}`); } catch {}
  try { db.exec(`DELETE FROM sqlite_sequence WHERE name = '${t}'`); } catch {}
}
db.exec('PRAGMA foreign_keys = ON');
console.log('Wiped existing data.');

// ── prepared statements ───────────────────────────────────────────────────────

const stmts = {
  user:       db.prepare('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)'),
  shipper:    db.prepare('INSERT INTO shippers (name) VALUES (?)'),
  commodity:  db.prepare('INSERT INTO commodities (shipper_id, name) VALUES (?, ?)'),
  buku:       db.prepare('INSERT INTO buku (tahun, bulan, status, created_by) VALUES (?, ?, ?, ?)'),
  booking:    db.prepare(`INSERT INTO bookings (public_id, job_no, shipper, commodity, peb, port, feeder, vessel_name, vessel_no, bon, in_date, out_date, trucking, status, notes, buku_id, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  container:  db.prepare('INSERT INTO containers (booking_id, container_no, seal_no, size, created_at) VALUES (?, ?, ?, ?, ?)'),
  dokumen:    db.prepare('INSERT INTO dokumen (booking_id, tipe, no_dokumen, qty, harga_satuan, biaya, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
  piutang:    db.prepare('INSERT INTO piutang (booking_id, jumlah, keterangan, created_by, created_at) VALUES (?, ?, ?, ?, ?)'),
  hutang:     db.prepare('INSERT INTO hutang (booking_id, pihak, keterangan, jumlah, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
  pembayaran: db.prepare('INSERT INTO pembayaran (entity_type, entity_id, jumlah, tanggal, metode, keterangan, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
  audit:      db.prepare('INSERT INTO audit_log (user_id, action, entity_type, entity_id, changes, timestamp) VALUES (?, ?, ?, ?, ?, ?)'),
};

// ── main (async for bcrypt) ───────────────────────────────────────────────────

async function main() {
  // Users
  console.log('Seeding users...');
  const userIds = {};
  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 12);
    const res = stmts.user.run(u.username, hash, u.full_name, u.role);
    userIds[u.username] = res.lastInsertRowid;
  }
  const adminId   = userIds['admin'];
  const financeId = userIds['finance1'];
  const workerIds = [userIds['worker1'], userIds['worker2']];

  // Shippers + commodities
  console.log('Seeding shippers...');
  const shipperList = [];
  for (const s of SHIPPERS) {
    const res = stmts.shipper.run(s.name);
    const sid = res.lastInsertRowid;
    for (const c of s.commodities) stmts.commodity.run(sid, c);
    shipperList.push({ id: sid, name: s.name, commodities: s.commodities });
  }

  // Buku
  console.log('Seeding buku...');
  const bukuMap = {};
  for (const b of buildBukuList()) {
    const res = stmts.buku.run(b.tahun, b.bulan, b.status, adminId);
    bukuMap[`${b.tahun}-${pad(b.bulan)}`] = res.lastInsertRowid;
  }

  // Bookings
  console.log('Seeding bookings...');
  let bookingCount = 0;

  for (const b of buildBukuList()) {
    const bukuId  = bukuMap[`${b.tahun}-${pad(b.bulan)}`];
    const count   = rndInt(3, 6);

    for (let i = 0; i < count; i++) {
      bookingCount++;
      const seq     = pad(bookingCount, 3);
      const jobNo   = `TAS/${b.tahun}/${pad(b.bulan)}/${seq}`;
      const shipper = rnd(shipperList);
      const commodity = rnd(shipper.commodities);
      const port    = rnd(PORTS);
      const vessel  = rnd(VESSELS);
      const dateStr = randomDate(b.tahun, b.bulan);
      const outDate = addDays(dateStr, rndInt(3, 10));
      const createdBy = rnd(workerIds);
      const createdAt = `${dateStr}T${pad(rndInt(8,17))}:${pad(rndInt(0,59))}:00`;

      let status;
      if (b.tahun === 2024) status = 'done';
      else if (b.tahun === 2025) status = b.bulan <= 10 ? 'done' : rnd(['done', 'in_progress']);
      else status = rnd(['in_progress', 'done', 'in_progress']);

      const bRes = stmts.booking.run(
        randomBytes(16).toString('hex'),
        jobNo, shipper.name, commodity,
        `PEB-${rndInt(100000, 999999)}`, port,
        `Feeder ${rndInt(1,5)}`, vessel, `V-${rndInt(100,999)}`,
        `BON-${rndInt(10000,99999)}`,
        dateStr, outDate, rnd(TRUCKING),
        status, status === 'done' ? 'Selesai tanpa kendala.' : null,
        bukuId, createdBy, createdAt, createdAt
      );
      const bookingId = bRes.lastInsertRowid;

      // Containers (1–3)
      const cCount = rndInt(1, 3);
      for (let c = 0; c < cCount; c++) {
        const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
        const prefix  = [0,1,2,3].map(() => letters[rndInt(0, letters.length-1)]).join('');
        stmts.container.run(bookingId, `${prefix}${rndInt(1000000,9999999)}`, `SEAL${rndInt(100000,999999)}`, rnd(SIZES), createdAt);
      }

      // Dokumen (2–4 lines)
      let totalBiaya = 0;
      const dCount = rndInt(2, 4);
      for (let d = 0; d < dCount; d++) {
        const qty   = rndInt(1, cCount);
        const harga = rndInt(5, 50) * 100_000;
        const biaya = qty * harga;
        totalBiaya += biaya;
        stmts.dokumen.run(bookingId, rnd(DOK_TYPES), `DOC-${rndInt(10000,99999)}`, qty, harga, biaya, financeId, createdAt);
      }

      // Piutang (~90%)
      if (Math.random() < 0.9) {
        const pRes = stmts.piutang.run(bookingId, totalBiaya, `Tagihan ${jobNo}`, financeId, createdAt);
        const piutangId = pRes.lastInsertRowid;
        const payChance = status === 'done' ? 0.85 : 0.3;
        if (Math.random() < payChance) {
          const partial = Math.random() < 0.2;
          const bayar   = partial ? Math.floor(totalBiaya * rndInt(40,80) / 100) : totalBiaya;
          stmts.pembayaran.run('piutang', piutangId, bayar, addDays(dateStr, rndInt(5,25)), rnd(METHODS), partial ? 'Pembayaran sebagian' : 'Lunas', financeId, createdAt);
        }
      }

      // Hutang (~50%)
      if (Math.random() < 0.5) {
        const hutangAmt = rndInt(2, 15) * 500_000;
        const hRes = stmts.hutang.run(bookingId, rnd(HUTANG_PIHAK), `Biaya trucking ${jobNo}`, hutangAmt, financeId, createdAt);
        if (status === 'done' && Math.random() < 0.75) {
          stmts.pembayaran.run('hutang', hRes.lastInsertRowid, hutangAmt, addDays(dateStr, rndInt(3,20)), rnd(METHODS), 'Pembayaran hutang trucking', financeId, createdAt);
        }
      }

      // Audit
      stmts.audit.run(createdBy, 'CREATE', 'booking', bookingId, JSON.stringify({ job_no: jobNo, status }), createdAt);
    }
  }

  // Stress test: 100 bookings per shipper in May 2026 (tests tab UI with 12 shippers)
  console.log('Seeding stress-test bookings (100 bookings × 12 shippers in May 2026)...');
  const stressBukuId = bukuMap['2026-05'];
  const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ';

  function seedBooking(shipperObj, bukuId, year, month) {
    bookingCount++;
    const seq = pad(bookingCount, 4);
    const jobNo = `TAS/${year}/${pad(month)}/${seq}`;
    const commodity = rnd(shipperObj.commodities);
    const port = rnd(PORTS);
    const vessel = rnd(VESSELS);
    const dateStr = randomDate(year, month);
    const outDate = addDays(dateStr, rndInt(3, 10));
    const createdBy = rnd(workerIds);
    const createdAt = `${dateStr}T${pad(rndInt(8, 17))}:${pad(rndInt(0, 59))}:00`;
    const status = rnd(['in_progress', 'done', 'done', 'in_progress']);

    const bRes = stmts.booking.run(
      randomBytes(16).toString('hex'),
      jobNo, shipperObj.name, commodity,
      `PEB-${rndInt(100000, 999999)}`, port,
      `Feeder ${rndInt(1, 5)}`, vessel, `V-${rndInt(100, 999)}`,
      `BON-${rndInt(10000, 99999)}`,
      dateStr, outDate, rnd(TRUCKING),
      status, status === 'done' ? 'Selesai tanpa kendala.' : null,
      bukuId, createdBy, createdAt, createdAt
    );
    const bookingId = bRes.lastInsertRowid;

    const cCount = rndInt(1, 3);
    for (let c = 0; c < cCount; c++) {
      const prefix = [0,1,2,3].map(() => LETTERS[rndInt(0, LETTERS.length-1)]).join('');
      stmts.container.run(bookingId, `${prefix}${rndInt(1000000, 9999999)}`, `SEAL${rndInt(100000, 999999)}`, rnd(SIZES), createdAt);
    }

    let totalBiaya = 0;
    for (let d = 0; d < rndInt(2, 4); d++) {
      const qty = rndInt(1, cCount);
      const harga = rndInt(5, 50) * 100_000;
      const biaya = qty * harga;
      totalBiaya += biaya;
      stmts.dokumen.run(bookingId, rnd(DOK_TYPES), `DOC-${rndInt(10000, 99999)}`, qty, harga, biaya, financeId, createdAt);
    }

    if (Math.random() < 0.9) {
      const pRes = stmts.piutang.run(bookingId, totalBiaya, `Tagihan ${jobNo}`, financeId, createdAt);
      if (Math.random() < (status === 'done' ? 0.8 : 0.25)) {
        const partial = Math.random() < 0.2;
        const bayar = partial ? Math.floor(totalBiaya * rndInt(40, 80) / 100) : totalBiaya;
        stmts.pembayaran.run('piutang', pRes.lastInsertRowid, bayar, addDays(dateStr, rndInt(5, 25)), rnd(METHODS), partial ? 'Pembayaran sebagian' : 'Lunas', financeId, createdAt);
      }
    }

    stmts.audit.run(createdBy, 'CREATE', 'booking', bookingId, JSON.stringify({ job_no: jobNo, status }), createdAt);
  }

  for (const s of shipperList) {
    for (let i = 0; i < 100; i++) seedBooking(s, stressBukuId, 2026, 5);
    console.log(`  ✓ ${s.name} — 100 bookings`);
  }
  console.log(`  Inserted ${shipperList.length * 100} stress-test bookings.`);

  console.log(`  Inserted ${bookingCount} bookings total.`);
  console.log('');
  console.log('Seed complete!');
  console.log('');
  console.log('Accounts:');
  console.log('  admin    / admin1234    (admin)');
  console.log('  finance1 / finance1234  (finance)');
  console.log('  worker1  / worker1234   (worker)');
  console.log('  worker2  / worker1234   (worker)');
  console.log('  manager  / manager1234  (admin)');
}

main().catch(err => { console.error(err); process.exit(1); });
