import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH ?? './data/app.db';

let db;

export function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('PRAGMA journal_mode = WAL');
    runMigrations(db);
  }
  return db;
}

function runMigrations(db) {
  const sql = readFileSync(join(__dirname, 'migrations/001_init.sql'), 'utf8');
  db.exec(sql);
  // 002: add in_date, out_date, trucking columns
  for (const col of [
    'ALTER TABLE bookings ADD COLUMN in_date TEXT',
    'ALTER TABLE bookings ADD COLUMN out_date TEXT',
    'ALTER TABLE bookings ADD COLUMN trucking TEXT',
  ]) {
    try { db.exec(col); } catch {}
  }
  // 003: dokumen table
  const sql003 = readFileSync(join(__dirname, 'migrations/002_dokumen.sql'), 'utf8');
  db.exec(sql003);
  // 004: finance tables (piutang, hutang, pembayaran)
  const sql004 = readFileSync(join(__dirname, 'migrations/003_finance.sql'), 'utf8');
  db.exec(sql004);
  // 005: invoice columns on dokumen (qty, harga_satuan)
  for (const col of [
    'ALTER TABLE dokumen ADD COLUMN qty INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE dokumen ADD COLUMN harga_satuan INTEGER NOT NULL DEFAULT 0',
  ]) {
    try { db.exec(col); } catch {}
  }
  // 006: metode column on pembayaran
  try { db.exec("ALTER TABLE pembayaran ADD COLUMN metode TEXT NOT NULL DEFAULT 'transfer'"); } catch {}
  // 007: shippers + commodities master tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS shippers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS commodities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shipper_id INTEGER NOT NULL REFERENCES shippers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(shipper_id, name)
    )
  `);
  // 008: commodity column on bookings
  try { db.exec("ALTER TABLE bookings ADD COLUMN commodity TEXT NOT NULL DEFAULT ''"); } catch {}
  // 009: buku (monthly ledger) + buku_id on bookings
  db.exec(`
    CREATE TABLE IF NOT EXISTS buku (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      tahun      INTEGER NOT NULL,
      bulan      INTEGER NOT NULL,
      status     TEXT NOT NULL DEFAULT 'open',
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tahun, bulan)
    )
  `);
  try { db.exec('ALTER TABLE bookings ADD COLUMN buku_id INTEGER REFERENCES buku(id)'); } catch {}
  // 010: public_id for unguessable booking URLs
  try { db.exec('ALTER TABLE bookings ADD COLUMN public_id TEXT'); } catch {}
  db.exec("UPDATE bookings SET public_id = lower(hex(randomblob(16))) WHERE public_id IS NULL");
  try { db.exec('CREATE UNIQUE INDEX idx_bookings_public_id ON bookings(public_id)'); } catch {}
  // 011: buku closed_at/closed_by audit columns
  try { db.exec('ALTER TABLE buku ADD COLUMN closed_at DATETIME'); } catch {}
  try { db.exec('ALTER TABLE buku ADD COLUMN closed_by INTEGER REFERENCES users(id)'); } catch {}
  // 012: app_settings, invoice_pajak, nota_reimbursement
  const sql012 = readFileSync(join(__dirname, 'migrations/011_invoice_pajak_reimbursement.sql'), 'utf8');
  db.exec(sql012);
  // 013: booking_documents table + port_discharge on bookings
  const sql013 = readFileSync(join(__dirname, 'migrations/013_booking_documents.sql'), 'utf8');
  db.exec(sql013);
  try { db.exec('ALTER TABLE bookings ADD COLUMN port_discharge TEXT'); } catch {}
  // Migrate existing peb data (only if old schema with no_peb still exists)
  try {
    db.exec(`
      INSERT INTO booking_documents (booking_id, doc_type, no_peb, created_by)
      SELECT id, 'peb', peb, created_by FROM bookings
      WHERE peb IS NOT NULL AND peb != ''
      AND id NOT IN (SELECT DISTINCT booking_id FROM booking_documents WHERE doc_type = 'peb')
    `);
  } catch {}
  // 014: feeder→pelayaran + container fields (no_sp, vendor, notes)
  try { db.exec('ALTER TABLE bookings RENAME COLUMN feeder TO pelayaran'); } catch {}
  try { db.exec('ALTER TABLE containers ADD COLUMN no_sp TEXT'); } catch {}
  try { db.exec('ALTER TABLE containers ADD COLUMN vendor TEXT'); } catch {}
  try { db.exec('ALTER TABLE containers ADD COLUMN notes TEXT'); } catch {}
  // 015: booking_flow_redesign — lokasi_muat, vendor→trucking, new container schedule cols
  try { db.exec('ALTER TABLE bookings ADD COLUMN lokasi_muat TEXT'); } catch {}
  try { db.exec('ALTER TABLE containers RENAME COLUMN vendor TO trucking'); } catch {}
  try { db.exec('ALTER TABLE containers ADD COLUMN biaya_trucking INTEGER'); } catch {}
  try { db.exec('ALTER TABLE containers ADD COLUMN in_date TEXT'); } catch {}
  try { db.exec('ALTER TABLE containers ADD COLUMN out_date TEXT'); } catch {}
  // 017: planned_qty, carrier, tanggal_pelayaran on bookings; container_no_2, seal_no_2 on containers
  try { db.exec("ALTER TABLE bookings ADD COLUMN planned_qty TEXT NOT NULL DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE bookings ADD COLUMN carrier TEXT NOT NULL DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE bookings ADD COLUMN tanggal_pelayaran TEXT NOT NULL DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE containers ADD COLUMN container_no_2 TEXT NOT NULL DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE containers ADD COLUMN seal_no_2 TEXT NOT NULL DEFAULT ''"); } catch {}
  // 016: hutang trucking — no_voucher, container_id, hutang_type
  try { db.exec('ALTER TABLE hutang ADD COLUMN no_voucher TEXT'); } catch {}
  try { db.exec('ALTER TABLE hutang ADD COLUMN container_id INTEGER'); } catch {}
  try { db.exec("ALTER TABLE hutang ADD COLUMN hutang_type TEXT NOT NULL DEFAULT 'vendor'"); } catch {}
  // back-fill hutang for existing containers that have trucking + biaya data
  db.exec(`
    INSERT INTO hutang (pihak, booking_id, jumlah, keterangan, hutang_type, container_id, created_by)
    SELECT c.trucking, c.booking_id, c.biaya_trucking, '', 'trucking', c.id, 1
    FROM containers c
    WHERE c.trucking IS NOT NULL AND c.trucking != ''
      AND c.biaya_trucking IS NOT NULL AND c.biaya_trucking > 0
      AND NOT EXISTS (
        SELECT 1 FROM hutang h WHERE h.container_id = c.id AND h.hutang_type = 'trucking'
      )
  `);
  // 018: booking_documents redesign — unified fields + hutang_dokumen
  const hasNoDok = db.prepare("SELECT COUNT(*) AS n FROM pragma_table_info('booking_documents') WHERE name='no_dok'").get().n;
  if (!hasNoDok) {
    db.exec(`
      ALTER TABLE booking_documents RENAME TO booking_documents_old;
      CREATE TABLE booking_documents (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id  INTEGER NOT NULL REFERENCES bookings(id),
        doc_type    TEXT NOT NULL CHECK(doc_type IN ('phyto','peb','coo','ico','kadin','certificate')),
        no_dok      TEXT,
        tgl_dok     TEXT,
        no_si       TEXT,
        no_inv      TEXT,
        created_by  INTEGER REFERENCES users(id),
        created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO booking_documents (id, booking_id, doc_type, no_dok, tgl_dok, no_si, no_inv, created_by, created_at)
      SELECT id, booking_id, doc_type, COALESCE(no_peb, no_phyto), tgl, no_si, no_inv, created_by, created_at
      FROM booking_documents_old;
      DROP TABLE booking_documents_old;
    `);
  }
  // 019: hutang_trucking_payments
  db.exec(`
    CREATE TABLE IF NOT EXISTS hutang_trucking_payments (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      hutang_id        INTEGER NOT NULL REFERENCES hutang(id) ON DELETE CASCADE,
      keterangan       TEXT,
      no_voucher       TEXT,
      tgl_pelunasan    TEXT,
      nilai_pembayaran INTEGER,
      tgl_pembayaran   TEXT,
      metode           TEXT NOT NULL DEFAULT 'transfer',
      created_by       INTEGER REFERENCES users(id),
      created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try { db.exec("ALTER TABLE hutang_trucking_payments ADD COLUMN metode TEXT NOT NULL DEFAULT 'transfer'"); } catch {}
  db.exec(`
    CREATE TABLE IF NOT EXISTS hutang_dokumen (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_document_id INTEGER NOT NULL REFERENCES booking_documents(id) ON DELETE CASCADE,
      booking_id          INTEGER NOT NULL REFERENCES bookings(id),
      keterangan          TEXT,
      no_voucher          TEXT,
      tgl_pelunasan       TEXT,
      nilai_pembayaran    INTEGER,
      tgl_pembayaran      TEXT,
      created_by          INTEGER REFERENCES users(id),
      created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // 020: dokumen fields redesign — new field set on booking_documents.
  // doc_type kept (= Tipe Dokumen). Old no_dok/tgl_dok/no_si/no_inv left dormant.
  for (const col of [
    'ALTER TABLE booking_documents ADD COLUMN no_sertifikat TEXT',
    'ALTER TABLE booking_documents ADD COLUMN tgl_bon TEXT',
    'ALTER TABLE booking_documents ADD COLUMN keterangan TEXT',
    'ALTER TABLE booking_documents ADD COLUMN no_job TEXT',
    'ALTER TABLE booking_documents ADD COLUMN nilai_pembayaran INTEGER',
    'ALTER TABLE booking_documents ADD COLUMN tipe_pembayaran TEXT',
  ]) {
    try { db.exec(col); } catch {}
  }
  // 021: drop the doc_type CHECK constraint so the expanded Tipe Dokumen master
  // list (BIAYA LAIN, LIFT ON, PIUTANG, …) can be stored. Rebuild table if needed.
  try {
    const ddl = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='booking_documents'").get()?.sql ?? '';
    if (ddl.includes('CHECK')) {
      db.exec(`
        ALTER TABLE booking_documents RENAME TO booking_documents_chk;
        CREATE TABLE booking_documents (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          booking_id       INTEGER NOT NULL REFERENCES bookings(id),
          doc_type         TEXT NOT NULL,
          no_dok           TEXT,
          tgl_dok          TEXT,
          no_si            TEXT,
          no_inv           TEXT,
          no_sertifikat    TEXT,
          tgl_bon          TEXT,
          keterangan       TEXT,
          no_job           TEXT,
          nilai_pembayaran INTEGER,
          tipe_pembayaran  TEXT,
          created_by       INTEGER REFERENCES users(id),
          created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO booking_documents
          (id, booking_id, doc_type, no_dok, tgl_dok, no_si, no_inv, no_sertifikat, tgl_bon, keterangan, no_job, nilai_pembayaran, tipe_pembayaran, created_by, created_at)
        SELECT id, booking_id, doc_type, no_dok, tgl_dok, no_si, no_inv, no_sertifikat, tgl_bon, keterangan, no_job, nilai_pembayaran, tipe_pembayaran, created_by, created_at
        FROM booking_documents_chk;
        DROP TABLE booking_documents_chk;
      `);
    }
  } catch {}
  // 022: biaya_tambahan on containers + normalize trucking vendor names.
  try { db.exec('ALTER TABLE containers ADD COLUMN biaya_tambahan INTEGER'); } catch {}
  try { db.exec("UPDATE containers SET trucking = 'MMC' WHERE trucking = 'TAS, PT./DAVID'"); } catch {}
  try { db.exec("UPDATE containers SET trucking = 'TAS' WHERE trucking IN ('TAS-T', 'TAS, PT.')"); } catch {}
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  getDb();
  console.log('Migrations ran successfully.');
}
