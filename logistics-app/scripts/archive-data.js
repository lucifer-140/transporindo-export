#!/usr/bin/env node
'use strict';

// Run from repo root: node scripts/archive-data.js
// Dumps bookings, containers, shippers, commodities, buku to server/data/archive-dump.json

import { DatabaseSync } from 'node:sqlite';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath    = join(__dirname, '..', 'server', 'data', 'app.db');
const outDir    = join(__dirname, '..', 'server', 'data');
const outPath   = join(outDir, 'archive-dump.json');

if (!existsSync(dbPath)) {
  console.error('DB not found:', dbPath);
  process.exit(1);
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const db = new DatabaseSync(dbPath);

const dump = {
  archived_at: new Date().toISOString(),
  buku:        db.prepare('SELECT * FROM buku').all(),
  shippers:    db.prepare('SELECT * FROM shippers').all(),
  commodities: db.prepare('SELECT * FROM commodities').all(),
  bookings:    db.prepare('SELECT * FROM bookings').all(),
  containers:  db.prepare('SELECT * FROM containers').all(),
};

writeFileSync(outPath, JSON.stringify(dump, null, 2));
console.log(`Archived ${dump.bookings.length} bookings, ${dump.shippers.length} shippers → ${outPath}`);

db.close();
