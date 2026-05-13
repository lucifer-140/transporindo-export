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
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  getDb();
  console.log('Migrations ran successfully.');
}
