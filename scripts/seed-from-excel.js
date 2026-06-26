/**
 * One-time seed: clear all non-user data, import 4 jobs from ASoft_Jobs_COMPLETE_May2026.xlsx
 * Run: node scripts/seed-from-excel.js
 */
'use strict';

const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const DB_FILE = path.join(__dirname, '../logistics-app/server/data/app.db');
const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA foreign_keys = OFF');
db.exec('PRAGMA journal_mode = WAL');

// ─── 1. CLEAR ALL NON-USER DATA ────────────────────────────────────────────
console.log('Clearing all non-user data...');
db.exec(`
  DELETE FROM hutang_trucking_payments;
  DELETE FROM hutang_dokumen;
  DELETE FROM booking_documents;
  DELETE FROM nota_reimbursement_items;
  DELETE FROM nota_reimbursement;
  DELETE FROM invoice_pajak_items;
  DELETE FROM invoice_pajak;
  DELETE FROM pembayaran;
  DELETE FROM hutang;
  DELETE FROM piutang;
  DELETE FROM dokumen;
  DELETE FROM containers;
  DELETE FROM audit_log;
  DELETE FROM bookings;
  DELETE FROM shippers;
  DELETE FROM commodities;
  DELETE FROM buku;
`);
console.log('Done clearing.');

// ─── 2. BUKU MAY 2026 ──────────────────────────────────────────────────────
const insertBuku = db.prepare(`
  INSERT INTO buku (tahun, bulan, status, created_by, created_at)
  VALUES (2026, 5, 'open', 1, '2026-05-01T00:00:00.000Z')
`);
const bukuResult = insertBuku.run();
const bukuId = bukuResult.lastInsertRowid;
console.log('Created buku May 2026, id:', bukuId);

// ─── 3. SHIPPERS ───────────────────────────────────────────────────────────
const insertShipper = db.prepare(`INSERT INTO shippers (name, created_at) VALUES (?, datetime('now'))`);

const shippers = [
  'SINAR MAS AGRO RESOURCES AND TECHNOLOGY TBK. (SMART TBK.)',
  'PT. SUMATERA JAYA LESTARI',
  'PT. METROPOLE PURNAMA CITRA',
  'PT.INDUSTRI AGRIBISNIS INDONESIA',
];
shippers.forEach(s => insertShipper.run(s));
console.log('Created shippers.');

// ─── 4. BOOKINGS ───────────────────────────────────────────────────────────
const insertBooking = db.prepare(`
  INSERT INTO bookings (
    job_no, shipper, peb, port, port_discharge, pelayaran,
    vessel_name, vessel_no, bon, status, commodity, planned_qty,
    lokasi_muat, carrier, tanggal_pelayaran, buku_id, public_id,
    created_by, created_at, updated_at
  ) VALUES (
    @job_no, @shipper, @peb, @port, @port_discharge, @pelayaran,
    @vessel_name, @vessel_no, @bon, @status, @commodity, @planned_qty,
    @lokasi_muat, @carrier, @tanggal_pelayaran, @buku_id, @public_id,
    1, @created_at, @created_at
  )
`);

const jobs = [
  {
    job_no: '38/V',
    shipper: 'SINAR MAS AGRO RESOURCES AND TECHNOLOGY TBK. (SMART TBK.)',
    peb: null,
    port: 'BELAWAN',
    port_discharge: 'QINDAO',
    pelayaran: 'EVERGREEN',
    vessel_name: 'EVER CONCERT',
    vessel_no: '0789-083N',
    bon: '0526/038',
    status: 'done',
    commodity: '',
    planned_qty: '20 STD x 6',
    lokasi_muat: 'KIM',
    carrier: 'EVERGREEN',
    tanggal_pelayaran: '',
    created_at: '2026-05-28T00:00:00.000Z',
    containers: [
      { size: '20', qty: 6 },
    ],
  },
  {
    job_no: '39/V',
    shipper: 'PT. SUMATERA JAYA LESTARI',
    peb: '029170',
    port: 'BELAWAN',
    port_discharge: 'ULSAN',
    pelayaran: 'NAMSUNG SHIPPING CO.,LTD.',
    vessel_name: 'SMA KLANG',
    vessel_no: '6009E',
    bon: '0526/039',
    status: 'done',
    commodity: 'WOOD PELLET',
    planned_qty: '20 STD x 12',
    lokasi_muat: 'HAMPARAN PERAK',
    carrier: 'NAMSUNG SHIPPING CO.,LTD.',
    tanggal_pelayaran: '',
    created_at: '2026-06-03T00:00:00.000Z',
    containers: [
      { size: '20', qty: 12 },
    ],
  },
  {
    job_no: '43/V',
    shipper: 'PT. METROPOLE PURNAMA CITRA',
    peb: '030191',
    port: 'BELAWAN',
    port_discharge: 'DOHA',
    pelayaran: 'MCC/MAERSK LINE GROUP',
    vessel_name: 'GREEN OWL',
    vessel_no: '619N',
    bon: '0526/043',
    status: 'done',
    commodity: 'FURNITURE',
    planned_qty: '20 STD x 1',
    lokasi_muat: 'PATUMBAK',
    carrier: 'MCC/MAERSK LINE GROUP',
    tanggal_pelayaran: '',
    created_at: '2026-05-28T00:00:00.000Z',
    containers: [
      { size: '20', qty: 1, container_no: 'TCLU2341637' },
    ],
  },
  {
    job_no: '44/V',
    shipper: 'PT.INDUSTRI AGRIBISNIS INDONESIA',
    peb: '030690',
    port: 'BELAWAN',
    port_discharge: 'GWANGYANG',
    pelayaran: 'MCC/MAERSK LINE GROUP',
    vessel_name: 'HUA XIN 678',
    vessel_no: '620N',
    bon: '0526/044',
    status: 'done',
    commodity: 'WOODCHIP',
    planned_qty: '40HC x 10',
    lokasi_muat: 'NAMORAMBE',
    carrier: 'MCC/MAERSK LINE GROUP',
    tanggal_pelayaran: '',
    created_at: '2026-05-28T00:00:00.000Z',
    containers: [
      { size: '40HC', qty: 10 },
    ],
  },
];

const bookingIds = {};
jobs.forEach(job => {
  const { containers, ...fields } = job;
  const res = insertBooking.run({ ...fields, buku_id: bukuId, public_id: crypto.randomUUID() });
  bookingIds[job.job_no] = res.lastInsertRowid;
  console.log(`Booking ${job.job_no} → id ${res.lastInsertRowid}`);
});

// ─── 5. CONTAINERS ─────────────────────────────────────────────────────────
const insertContainer = db.prepare(`
  INSERT INTO containers (booking_id, container_no, seal_no, size, created_at)
  VALUES (@booking_id, @container_no, @seal_no, @size, datetime('now'))
`);

jobs.forEach(job => {
  const bookingId = bookingIds[job.job_no];
  job.containers.forEach(c => {
    for (let i = 0; i < c.qty; i++) {
      insertContainer.run({
        booking_id: bookingId,
        container_no: c.container_no || '',
        seal_no: '',
        size: c.size,
      });
    }
  });
  console.log(`Containers for ${job.job_no}: ${job.containers.reduce((s, c) => s + c.qty, 0)}`);
});

// ─── 6. PIUTANG (Revenue Lines) ────────────────────────────────────────────
const insertPiutang = db.prepare(`
  INSERT INTO piutang (booking_id, jumlah, keterangan, created_by, created_at)
  VALUES (@booking_id, @jumlah, @keterangan, 1, datetime('now'))
`);

// piutang = 1 row per booking (UNIQUE constraint), store total revenue
const revenueByJob = [
  { job: '38/V', jumlah: 23332500,  keterangan: 'TAS-0526-038 | EMKL FEE 6x20 STD KIM' },
  { job: '39/V', jumlah: 56608000,  keterangan: 'TAS-0526-039 | EMKL + LIFT ON/OFF + EPASS + FREIGHT' },
  { job: '43/V', jumlah: 1431250,   keterangan: 'TAS-0526-043 | EMKL FEE 1x20 STD PATUMBAK' },
  { job: '44/V', jumlah: 164205000, keterangan: 'TAS-0526-044 | EMKL FEE 10x40 HQ NAMORAMBE' },
];

revenueByJob.forEach(r => {
  insertPiutang.run({ booking_id: bookingIds[r.job], jumlah: r.jumlah, keterangan: r.keterangan });
});
console.log(`Piutang: ${revenueByJob.length} entries`);

// ─── 7. HUTANG (Supplier Costs / AP) ──────────────────────────────────────
const insertHutang = db.prepare(`
  INSERT INTO hutang (booking_id, pihak, keterangan, no_voucher, jumlah, hutang_type, created_by, created_at)
  VALUES (@booking_id, @pihak, @keterangan, @no_voucher, @jumlah, 'vendor', 1, datetime('now'))
`);

const supplierCosts = [
  // 38/V
  { job: '38/V', no_voucher: 'LK26050107C', pihak: 'BIAYA LAIN', keterangan: 'O CHASIS 3', jumlah: 750000 },
  { job: '38/V', no_voucher: 'KK26050416',  pihak: 'BIAYA LAIN', keterangan: 'AMPRAH TGL15/05', jumlah: 50000 },
  { job: '38/V', no_voucher: 'LK26050108C', pihak: 'BIAYA LAIN', keterangan: 'FULL PANE', jumlah: 20000 },
  { job: '38/V', no_voucher: 'LK26050108C', pihak: 'BIAYA LAIN', keterangan: 'EMPTY SUPIR 3', jumlah: 60000 },
  { job: '38/V', no_voucher: 'LK26050108C', pihak: 'BIAYA LAIN', keterangan: 'FULL SUPIR 3', jumlah: 90000 },
  { job: '38/V', no_voucher: 'LK26050104A', pihak: 'LIFT ON',    keterangan: 'LIFT ON 6X20', jumlah: 2872000 },
  { job: '38/V', no_voucher: 'LK26050104C', pihak: 'BIAYA LAIN', keterangan: 'ADMON', jumlah: 6000 },
  { job: '38/V', no_voucher: 'LK26050104C', pihak: 'BIAYA LAIN', keterangan: 'DO', jumlah: 4000 },
  { job: '38/V', no_voucher: 'LK26050105A', pihak: 'LIFT OFF',   keterangan: 'LIFT OFF 6X20', jumlah: 1909000 },
  { job: '38/V', no_voucher: 'LK26050105B', pihak: 'BIAYA LAIN', keterangan: 'VGM', jumlah: 4000 },
  { job: '38/V', no_voucher: 'LK26050105B', pihak: 'BIAYA LAIN', keterangan: 'OPTR+TALLY', jumlah: 40000 },
  { job: '38/V', no_voucher: 'LK26050105B', pihak: 'BIAYA LAIN', keterangan: 'ADMOFF', jumlah: 6000 },
  { job: '38/V', no_voucher: 'KK26050434',  pihak: 'BIAYA LAIN', keterangan: 'AMPRAH PIL', jumlah: 100000 },
  // 39/V
  { job: '39/V', no_voucher: 'LK26050107C', pihak: 'BIAYA LAIN', keterangan: 'O CHASIS 5', jumlah: 1250000 },
  { job: '39/V', no_voucher: 'KK26050421B', pihak: 'BIAYA LAIN', keterangan: 'FC', jumlah: 22000 },
  { job: '39/V', no_voucher: 'KK26050421A', pihak: 'PEB',        keterangan: 'PEB 12X20', jumlah: 84000 },
  { job: '39/V', no_voucher: 'LK26050104A', pihak: 'LIFT ON',    keterangan: 'LIFT ON 12X20', jumlah: 5020000 },
  { job: '39/V', no_voucher: 'LK26050104B', pihak: 'LIFT OFF',   keterangan: 'LIFT OFF 12X20', jumlah: 3759000 },
  { job: '39/V', no_voucher: 'LK26050104C', pihak: 'BIAYA LAIN', keterangan: 'ADMON', jumlah: 15000 },
  { job: '39/V', no_voucher: 'LK26050104C', pihak: 'BIAYA LAIN', keterangan: 'ADMOFF', jumlah: 15000 },
  { job: '39/V', no_voucher: 'LK26050104C', pihak: 'BIAYA LAIN', keterangan: 'VGM', jumlah: 5000 },
  { job: '39/V', no_voucher: 'LK26050106C', pihak: 'BIAYA LAIN', keterangan: 'DO', jumlah: 5000 },
  { job: '39/V', no_voucher: 'LK26050107C', pihak: 'BIAYA LAIN', keterangan: 'OPTR+TALLY', jumlah: 40000 },
  // 43/V
  { job: '43/V', no_voucher: 'LK26050110D', pihak: 'BIAYA LAIN', keterangan: 'MINTA NO', jumlah: 80000 },
  { job: '43/V', no_voucher: 'LK26050111A', pihak: 'LIFT OFF',   keterangan: 'LIFT OFF 1X20', jumlah: 506000 },
  { job: '43/V', no_voucher: 'LK26050111B', pihak: 'BIAYA LAIN', keterangan: 'ADMOFF', jumlah: 6000 },
  { job: '43/V', no_voucher: 'LK26050106A', pihak: 'LIFT ON',    keterangan: 'LIFT ON 1X20', jumlah: 550000 },
  { job: '43/V', no_voucher: 'KK26050434',  pihak: 'BIAYA LAIN', keterangan: 'AMMPRAH', jumlah: 75000 },
  { job: '43/V', no_voucher: 'LK26050106C', pihak: 'BIAYA LAIN', keterangan: 'ADMON', jumlah: 6000 },
  { job: '43/V', no_voucher: 'KK26050430A', pihak: 'PIUTANG',    keterangan: 'VL MTP 047', jumlah: 151400 },
  // 44/V
  { job: '44/V', no_voucher: 'LK26050109C', pihak: 'BIAYA LAIN', keterangan: 'OPTR+TALLY DEPO', jumlah: 40000 },
  { job: '44/V', no_voucher: 'LK26050110D', pihak: 'BIAYA LAIN', keterangan: 'MINTA NO', jumlah: 70000 },
  { job: '44/V', no_voucher: 'LK26050108C', pihak: 'BIAYA LAIN', keterangan: 'U MKN SUPIR 10', jumlah: 500000 },
  { job: '44/V', no_voucher: 'LK26050106A', pihak: 'LIFT ON',    keterangan: 'LIFT ON 10X40', jumlah: 8000000 },
  { job: '44/V', no_voucher: 'LK26050106B', pihak: 'LIFT OFF',   keterangan: 'LIFT OFF 10X40', jumlah: 6273000 },
  { job: '44/V', no_voucher: 'LK26050106C', pihak: 'BIAYA LAIN', keterangan: 'ADMOFF', jumlah: 10000 },
  { job: '44/V', no_voucher: 'LK26050106C', pihak: 'BIAYA LAIN', keterangan: 'ADMON', jumlah: 10000 },
  { job: '44/V', no_voucher: 'LK26050106C', pihak: 'BIAYA LAIN', keterangan: 'VGM', jumlah: 4000 },
];

supplierCosts.forEach(h => {
  insertHutang.run({
    booking_id: bookingIds[h.job],
    pihak: h.pihak,
    keterangan: h.keterangan,
    no_voucher: h.no_voucher,
    jumlah: h.jumlah,
  });
});
console.log(`Hutang: ${supplierCosts.length} entries`);

// ─── SUMMARY ───────────────────────────────────────────────────────────────
const summary = db.prepare(`SELECT job_no, shipper, status FROM bookings ORDER BY id`).all();
console.log('\n=== IMPORT COMPLETE ===');
summary.forEach(b => console.log(` ${b.job_no}  ${b.shipper}  [${b.status}]`));

const counts = {
  bookings: db.prepare('SELECT COUNT(*) as c FROM bookings').get().c,
  containers: db.prepare('SELECT COUNT(*) as c FROM containers').get().c,
  piutang: db.prepare('SELECT COUNT(*) as c FROM piutang').get().c,
  hutang: db.prepare('SELECT COUNT(*) as c FROM hutang').get().c,
};
console.log('Counts:', counts);
