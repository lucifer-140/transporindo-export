/**
 * One-time seed: clear all non-user data, import 4 jobs from ASoft_Jobs_COMPLETE_May2026.xlsx
 * Run: node scripts/seed-from-excel.js
 */
'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

// Forwarder used as trucking vendor across all jobs
const TR = 'TAS, PT./DAVID';

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
    planned_qty: '6x20ft',
    lokasi_muat: 'KIM',
    carrier: 'EVERGREEN',
    tanggal_pelayaran: '',
    created_at: '2026-05-28T00:00:00.000Z',
    // 6×20 STD shipped as 3 trucking moves of 2x20 (partner row Rp 0 → merged)
    containers: [
      { size: '2x20', container_no: 'EGSU2161037', seal_no: 'EMCWRT0234', container_no_2: 'EGSU2328119', seal_no_2: 'EMCWRT0244', no_sp: '000492/26', trucking: TR, biaya_trucking: 1296250, in_date: '2026-05-15', out_date: '2026-05-18', notes: 'KIM' },
      { size: '2x20', container_no: 'EGSU3406622', seal_no: 'EMCWRT0254', container_no_2: 'EGSU3623905', seal_no_2: 'EMCWRT0264', no_sp: '000494/26', trucking: TR, biaya_trucking: 1296250, in_date: '2026-05-15', out_date: '2026-05-18', notes: 'KIM' },
      { size: '2x20', container_no: 'EGSU2185126', seal_no: 'EMCWRT0274', container_no_2: 'EGSU2215642', seal_no_2: 'EMCWRT0284', no_sp: '000496/26', trucking: TR, biaya_trucking: 1296250, in_date: '2026-05-15', out_date: '2026-05-18', notes: 'KIM' },
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
    planned_qty: '12x20ft',
    lokasi_muat: 'HAMPARAN PERAK',
    carrier: 'NAMSUNG SHIPPING CO.,LTD.',
    tanggal_pelayaran: '',
    created_at: '2026-06-03T00:00:00.000Z',
    // 12×20 STD = 2 single 20ft + 5 trucking moves of 2x20
    containers: [
      { size: '20ft', container_no: 'NSSU0150252', seal_no: 'NS2656854', no_sp: '000626/26', trucking: TR, biaya_trucking: 1276250, in_date: '2026-05-15', out_date: '2026-05-18', notes: 'H.PERAK' },
      { size: '2x20', container_no: 'TEMU5751843', seal_no: 'NS2656801', container_no_2: 'NSSU0089070', seal_no_2: 'NS2656859', no_sp: '000628/26', trucking: TR, biaya_trucking: 2101250, in_date: '2026-05-16', out_date: '2026-05-18', notes: 'H.PERAK' },
      { size: '2x20', container_no: 'NSSU0186321', seal_no: 'NS2656810', container_no_2: 'CAIU6946189', seal_no_2: 'NS2656848', no_sp: '000630/26', trucking: TR, biaya_trucking: 2101250, in_date: '2026-05-16', out_date: '2026-05-18', notes: 'H.PERAK' },
      { size: '2x20', container_no: 'NSSU0166027', seal_no: 'NS2656819', container_no_2: 'SEGU3952272', seal_no_2: 'NS2656830', no_sp: '000632/26', trucking: TR, biaya_trucking: 2101250, in_date: '2026-05-16', out_date: '2026-05-18', notes: 'H.PERAK' },
      { size: '2x20', container_no: 'SEKU1399162', seal_no: 'NS2656832', container_no_2: 'NSDU2003247', seal_no_2: 'NS2656874', no_sp: '000634/26', trucking: TR, biaya_trucking: 2101250, in_date: '2026-05-16', out_date: '2026-05-18', notes: 'H.PERAK' },
      { size: '2x20', container_no: 'LYGU3130021', seal_no: 'NS2656888', container_no_2: 'TLLU3203179', seal_no_2: 'NS2656885', no_sp: '000636/26', trucking: TR, biaya_trucking: 2101250, in_date: '2026-05-16', out_date: '2026-05-18', notes: 'H.PERAK' },
      { size: '20ft', container_no: 'DYLU2158500', seal_no: 'NS2656872', no_sp: '000638/26', trucking: TR, biaya_trucking: 1276250, in_date: '2026-05-15', out_date: '2026-05-18', notes: 'H.PERAK' },
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
    planned_qty: '1x20ft',
    lokasi_muat: 'PATUMBAK',
    carrier: 'MCC/MAERSK LINE GROUP',
    tanggal_pelayaran: '',
    created_at: '2026-05-28T00:00:00.000Z',
    containers: [
      { size: '20ft', container_no: 'TCLU2341637', seal_no: 'ML-ID1068533', no_sp: '000558/26', trucking: TR, biaya_trucking: 1431250, in_date: '2026-05-19', out_date: '2026-05-22', notes: 'PATUMBAK' },
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
    planned_qty: '10x40HC',
    lokasi_muat: 'NAMORAMBE',
    carrier: 'MCC/MAERSK LINE GROUP',
    tanggal_pelayaran: '',
    created_at: '2026-05-28T00:00:00.000Z',
    containers: [
      { size: '40HC', container_no: 'TRHU4259787', seal_no: 'ML-ID1068528', no_sp: '000574/26', trucking: TR, biaya_trucking: 2002500, in_date: '2026-05-20', out_date: '2026-05-22', notes: 'NAMORAMBE' },
      { size: '40HC', container_no: 'TCNU2058136', seal_no: 'ML-ID106529',  no_sp: '000576/26', trucking: TR, biaya_trucking: 2002500, in_date: '2026-05-20', out_date: '2026-05-22', notes: 'NAMORAMBE' },
      { size: '40HC', container_no: 'BEAU6389670', seal_no: 'ML-ID1068530', no_sp: '000578/26', trucking: TR, biaya_trucking: 2002500, in_date: '2026-05-20', out_date: '2026-05-22', notes: 'NAMORAMBE' },
      { size: '40HC', container_no: 'SUDU5938566', seal_no: 'ML-ID1068521', no_sp: '000560/26', trucking: TR, biaya_trucking: 2002500, in_date: '2026-05-20', out_date: '2026-05-22', notes: 'NAMORAMBE' },
      { size: '40HC', container_no: 'MRSU3848368', seal_no: 'ML-ID1068522', no_sp: '000562/26', trucking: TR, biaya_trucking: 2002500, in_date: '2026-05-20', out_date: '2026-05-22', notes: 'NAMORAMBE' },
      { size: '40HC', container_no: 'MRKU2807187', seal_no: 'ML-ID1068523', no_sp: '000564/26', trucking: TR, biaya_trucking: 2002500, in_date: '2026-05-20', out_date: '2026-05-22', notes: 'NAMORAMBE' },
      { size: '40HC', container_no: 'MSKU9749335', seal_no: 'ML-ID1068524', no_sp: '000566/26', trucking: TR, biaya_trucking: 2002500, in_date: '2026-05-20', out_date: '2026-05-22', notes: 'NAMORAMBE' },
      { size: '40HC', container_no: 'TGBU6646190', seal_no: 'ML-ID1068525', no_sp: '000568/26', trucking: TR, biaya_trucking: 2002500, in_date: '2026-05-20', out_date: '2026-05-22', notes: 'NAMORAMBE' },
      { size: '40HC', container_no: 'MRSU3207066', seal_no: 'ML-ID1068526', no_sp: '000570/26', trucking: TR, biaya_trucking: 2002500, in_date: '2026-05-20', out_date: '2026-05-22', notes: 'NAMORAMBE' },
      { size: '40HC', container_no: 'CAAU5275843', seal_no: 'ML-ID1068527', no_sp: '000572/26', trucking: TR, biaya_trucking: 2002500, in_date: '2026-05-20', out_date: '2026-05-22', notes: 'NAMORAMBE' },
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
  INSERT INTO containers (
    booking_id, container_no, seal_no, size, container_no_2, seal_no_2,
    no_sp, trucking, biaya_trucking, in_date, out_date, notes, created_at
  ) VALUES (
    @booking_id, @container_no, @seal_no, @size, @container_no_2, @seal_no_2,
    @no_sp, @trucking, @biaya_trucking, @in_date, @out_date, @notes, datetime('now')
  )
`);

jobs.forEach(job => {
  const bookingId = bookingIds[job.job_no];
  job.containers.forEach(c => {
    insertContainer.run({
      booking_id: bookingId,
      container_no: c.container_no || '',
      seal_no: c.seal_no || '',
      size: c.size,
      container_no_2: c.container_no_2 || '',
      seal_no_2: c.seal_no_2 || '',
      no_sp: c.no_sp || '',
      trucking: c.trucking || '',
      biaya_trucking: c.biaya_trucking ?? null,
      in_date: c.in_date || '',
      out_date: c.out_date || '',
      notes: c.notes || '',
    });
  });
  console.log(`Containers for ${job.job_no}: ${job.containers.length} rows`);
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

// ─── 8. DOKUMEN (from import_emkl_certificates_4jobs.csv) ──────────────────
const csvPath = path.join(__dirname, '..', 'import_emkl_certificates_4jobs.csv');
if (fs.existsSync(csvPath)) {
  const insertDoc = db.prepare(`
    INSERT INTO booking_documents
      (booking_id, doc_type, no_sertifikat, tgl_bon, keterangan, no_job, nilai_pembayaran, tipe_pembayaran, created_by, created_at)
    VALUES
      (@booking_id, @doc_type, @no_sertifikat, @tgl_bon, @keterangan, @no_job, @nilai_pembayaran, @tipe_pembayaran, 1, datetime('now'))
  `);

  // DD-MM-YYYY → YYYY-MM-DD (empty if not matched)
  const toIso = (s) => {
    const m = String(s || '').trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
  };
  // minimal CSV splitter (handles optional double-quotes)
  const splitCsv = (line) => {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { q = !q; }
      else if (ch === ',' && !q) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map(x => x.trim());
  };

  const raw = fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, '');
  const lines = raw.split(/\r?\n/).filter(l => l.trim() !== '');
  lines.shift(); // header
  let docCount = 0, skipped = 0;
  for (const line of lines) {
    const [tipe, noSert, tglBon, noJob, nilai, pembayaran, keterangan] = splitCsv(line);
    const bookingId = bookingIds[noJob];
    if (!bookingId) { skipped++; continue; }
    insertDoc.run({
      booking_id: bookingId,
      doc_type: tipe || 'BIAYA LAIN',
      no_sertifikat: noSert || '',
      tgl_bon: toIso(tglBon),
      keterangan: keterangan || '',
      no_job: noJob || '',
      nilai_pembayaran: nilai ? parseInt(String(nilai).replace(/[^\d]/g, ''), 10) || 0 : 0,
      tipe_pembayaran: /credit/i.test(pembayaran) ? 'credit' : /cash/i.test(pembayaran) ? 'cash' : '',
    });
    docCount++;
  }
  console.log(`Dokumen: ${docCount} imported${skipped ? `, ${skipped} skipped (no matching job)` : ''}`);
} else {
  console.log('Dokumen CSV not found, skipping doc import:', csvPath);
}

// ─── SUMMARY ───────────────────────────────────────────────────────────────
const summary = db.prepare(`SELECT job_no, shipper, status FROM bookings ORDER BY id`).all();
console.log('\n=== IMPORT COMPLETE ===');
summary.forEach(b => console.log(` ${b.job_no}  ${b.shipper}  [${b.status}]`));

const counts = {
  bookings: db.prepare('SELECT COUNT(*) as c FROM bookings').get().c,
  containers: db.prepare('SELECT COUNT(*) as c FROM containers').get().c,
  piutang: db.prepare('SELECT COUNT(*) as c FROM piutang').get().c,
  hutang: db.prepare('SELECT COUNT(*) as c FROM hutang').get().c,
  documents: db.prepare('SELECT COUNT(*) as c FROM booking_documents').get().c,
};
console.log('Counts:', counts);
