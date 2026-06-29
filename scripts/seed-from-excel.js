/**
 * Seed: clear all non-user data, import 9 EMKL jobs — Buku May 2026 (period 0526).
 * Source: EMKL_Master/Detail/Detail2 (Master.Mdb) + Sell_Master (202605/Data.Mdb).
 * Trucking renamed: TAS, PT./DAVID → MMC ; TAS, PT. / TAS-T → TAS.
 * Container notes intentionally left empty. lokasi_muat mapped to Tarif Angkutan
 * table labels (see client/src/data/tarif.js) so the dropdown + auto-price line up.
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

// DD → 2026-05-DD (all source dates fall in May 2026)
const d = (day) => `2026-05-${String(day).padStart(2, '0')}`;

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
const bukuId = db.prepare(`
  INSERT INTO buku (tahun, bulan, status, created_by, created_at)
  VALUES (2026, 5, 'open', 1, '2026-05-01T00:00:00.000Z')
`).run().lastInsertRowid;
console.log('Created buku May 2026, id:', bukuId);

// ─── 3. SHIPPERS + COMMODITIES ─────────────────────────────────────────────
const SHIPPERS = [
  { name: 'PT. OLAM INDONESIA',                                              commodity: 'COFFEE' },
  { name: 'SINAR MAS AGRO RESOURCES AND TECHNOLOGY TBK. (SMART TBK.)',       commodity: null },
  { name: 'PT. SUMATERA JAYA LESTARI',                                       commodity: 'WOOD PELLET' },
  { name: 'PT. METROPOLE PURNAMA CITRA',                                     commodity: 'FURNITURE' },
  { name: 'PT.INDUSTRI AGRIBISNIS INDONESIA',                               commodity: 'WOODCHIP' },
  { name: 'PT. ROYAL PACIFIC INDAH INTERNATIONAL',                          commodity: 'COFFEE' },
];
const insShipper   = db.prepare(`INSERT INTO shippers (name, created_at) VALUES (?, datetime('now'))`);
const insCommodity = db.prepare(`INSERT INTO commodities (shipper_id, name) VALUES (?, ?)`);
for (const s of SHIPPERS) {
  const id = insShipper.run(s.name).lastInsertRowid;
  if (s.commodity) insCommodity.run(id, s.commodity);
}
console.log(`Created ${SHIPPERS.length} shippers.`);

// ─── 4. JOBS ───────────────────────────────────────────────────────────────
// container tuple: [cont_no, seal_no, no_sp, biaya_trucking, in_day, out_day]
// doc tuple:       [tipe, no_sertifikat, tgl_bon_day, nilai, keterangan]
const jobs = [
  {
    job_no: '29/V', shipper: 'PT. OLAM INDONESIA', commodity: 'COFFEE',
    port_discharge: 'YOKOHAMA', pelayaran: 'WAN HAI', vessel_name: 'CTP GOLDEN', vessel_no: '07W26',
    bon: '0526/029', planned_qty: '6x20ft', size: '20ft', trucking: 'MMC',
    lokasi_muat: 'PATUMBAK - NAMORAMBE - TG. MORAWA - JL. BINJAI', created_at: d(11),
    containers: [
      ['WHSU2486310', 'WHA3256252', '000544/26', 1431250, 11, 14],
      ['FYCU7154479', 'WHA3256253', '000546/26', 2400000, 12, 14],
      ['WHSU0332125', 'WHA3256254', '000545/26', 0,       12, 14],
      ['TIIU2568695', 'WHA3256255', '000548/26', 1431250, 12, 14],
      ['WHSU2824187', 'WHA3256256', '000550/26', 2400000, 12, 14],
      ['WHSU0060618', 'WHA3256257', '000549/26', 0,       12, 14],
    ],
    docs: [
      ['PHYTOSANITARY',   'KK26050406C', 11, 750000, 'SPPD RENTAL'],
      ['BIAYA LAIN',      'KK26050416',  21, 100000, 'AMPRAH TGL 16/05'],
      ['PEB',             'KK26050403A', 18, 42000,  '1X20'],
      ['PELANCAR BERKAS', 'KK26050408A', 18, 20000,  'OLAM 164'],
      ['PELANCAR PHYTO',  'KK26050408B', 18, 15000,  'OLAM 164'],
      ['PHYTOSANITARY',   'KK26050408C', 18, 872600, 'OLAM 164+DINAS'],
      ['BIAYA LAIN',      'KK26050408D', 18, 15000,  'CTK PHYTO'],
      ['LIFT ON',         'LK26050100A', 8,  4818000,'6X20'],
      ['BIAYA LAIN',      'LK26050100D', 8,  6000,   'ADMON'],
      ['PIUTANG',         'LK26050100C', 8,  900000, 'SEAL'],
      ['BIAYA LAIN',      'LK26050101C', 9,  6000,   'ADMOFF'],
      ['BIAYA LAIN',      'LK26050101C', 9,  4000,   'VGM'],
      ['BIAYA LAIN',      'LK26050101C', 9,  6000,   'NPE'],
      ['BIAYA LAIN',      'LK26050106C', 16, 500000, 'O CHSIS 2'],
      ['BIAYA LAIN',      'LK26050102B', 11, 50000,  'MINTA NO'],
      ['BIAYA LAIN',      'LK26050102B', 11, 16000,  'OPTR+TALLY'],
    ],
  },
  {
    job_no: '31/V', shipper: 'SINAR MAS AGRO RESOURCES AND TECHNOLOGY TBK. (SMART TBK.)', commodity: '',
    port_discharge: 'QINGDAO', pelayaran: 'OOCL', vessel_name: 'INTEGRA', vessel_no: '173E',
    bon: '0526/031', planned_qty: '6x20ft', size: '20ft', trucking: 'MMC',
    lokasi_muat: 'SMART, TPI, BLW SEKITARNYA', created_at: d(11),
    containers: [
      ['CSNU2552082', 'OOLKHJ8032', '014326/25', 1296250, 11, 15],
      ['CSNU2521230', 'OOLKHJ8033', '014325/25', 0,       11, 15],
      ['CSNU2431990', 'OOLKHJ8034', '014328/25', 1296250, 11, 15],
      ['OOCU0783904', 'OOLKHJ8035', '014327/25', 0,       11, 15],
      ['CSNU2866571', 'OOLKHJ8036', '014330/25', 1296250, 12, 15],
      ['FTAU2371253', 'OOLKHJ8017', '014329/25', 0,       12, 15],
    ],
    docs: [
      ['BIAYA LAIN', 'LK26050108C', 19, 60000,   'EMPTY SUPIR 3'],
      ['LIFT ON',    'LK26050101A', 9,  3785000, '6X20'],
      ['BIAYA LAIN', 'LK26050101C', 9,  6000,    'ADMON'],
      ['BIAYA LAIN', 'LK26050101C', 9,  4000,    'DO'],
      ['BIAYA LAIN', 'LK26050102B', 11, 4000,    'VGM'],
      ['BIAYA LAIN', 'LK26050102B', 11, 6000,    'NPE'],
      ['BIAYA LAIN', 'LK26050102B', 11, 40000,   'OPRT+TALLY'],
      ['LIFT OFF',   'LK26050102A', 11, 1909000, '6X20'],
      ['PIUTANG',    '',            20, 2100000, 'BURUH 12 MEI'],
    ],
  },
  {
    job_no: '32/V', shipper: 'PT. OLAM INDONESIA', commodity: 'COFFEE',
    port_discharge: 'OAKLAND', pelayaran: 'OCEAN NETWORK EXPRESS', vessel_name: 'SINAR BAJO', vessel_no: '118N',
    bon: '0526/032', planned_qty: '1x20ft', size: '20ft', trucking: 'LAIN',
    lokasi_muat: 'PATUMBAK - NAMORAMBE - TG. MORAWA - JL. BINJAI', created_at: d(12),
    containers: [
      ['ONEU2366715', 'IDA928327', '014332/25', 1900000, 12, 15],
    ],
    docs: [
      ['BIAYA LAIN',      'LK26050103C', 12, 4000,   'DO'],
      ['BIAYA LAIN',      'LK26050103C', 12, 10000,  'OPTR+TALLY DEPO'],
      ['PHYTOSANITARY',   'KK26050408C', 18, 750000, 'SPPD RENTAL'],
      ['PIUTANG',         'KK26050408E', 18, 180000, 'BY MKN KARANTINA'],
      ['PELANCAR BERKAS', 'KK26050409A', 18, 20000,  'OLAM 149'],
      ['BIAYA LAIN',      'LK26050103C', 12, 1000,   'NPE'],
      ['LIFT OFF',        'LK26050103B', 12, 506000, '1X20'],
      ['BIAYA LAIN',      'LK26050103C', 12, 6000,   'ADMOFF'],
      ['BIAYA LAIN',      'LK26050103C', 12, 6000,   'ADMON'],
      ['PHYTOSANITARY',   'KK26050409C', 18, 774600, 'OLAM 149+DINAS'],
      ['PELANCAR PHYTO',  'KK26050409B', 18, 15000,  'OLAM 149'],
    ],
  },
  {
    job_no: '36/V', shipper: 'PT. OLAM INDONESIA', commodity: 'COFFEE',
    port_discharge: 'LOS ANGELES', pelayaran: 'OCEAN NETWORK EXPRESS', vessel_name: 'SINAR BAJO', vessel_no: '118N',
    bon: '0526/036', planned_qty: '1x20ft', size: '20ft', trucking: 'MMC',
    lokasi_muat: 'CANANG EXPORT', created_at: d(12),
    containers: [
      ['SEKU1545462', 'IDA928335', '014336/25', 1431250, 12, 15],
    ],
    docs: [
      ['BIAYA LAIN',      'LK26050103C', 12, 16000,  'OPTR+TALY DEPO'],
      ['PEB',             'KK26050404',  18, 7000,   '1X20'],
      ['PELANCAR BERKAS', 'KK26050409A', 18, 20000,  'OLAM 139'],
      ['BIAYA LAIN',      'LK26050103C', 12, 4000,   'VGM'],
      ['BIAYA LAIN',      'LK26050103C', 12, 1000,   'NPE'],
      ['LIFT OFF',        'LK26050103B', 12, 506000, '1X20'],
      ['BIAYA LAIN',      'LK26050103C', 12, 6000,   'ADM OFF'],
      ['LIFT ON',         'LK26050103A', 12, 483000, '1X20'],
      ['BIAYA LAIN',      'LK26050103C', 12, 6000,   'ADMON'],
      ['PELANCAR PHYTO',  'KK26050409B', 18, 15000,  'OLAM 139'],
      ['PELANCAR BERKAS', 'KK26050409A', 18, 50000,  'SPPD'],
      ['BIAYA LAIN',      'KK26050409D', 18, 7000,   'CTK PHYTO'],
    ],
  },
  {
    job_no: '38/V', shipper: 'SINAR MAS AGRO RESOURCES AND TECHNOLOGY TBK. (SMART TBK.)', commodity: '',
    port_discharge: 'QINDAO', pelayaran: 'EVERGREEN', vessel_name: 'EVER CONCERT', vessel_no: '0789-083N',
    bon: '0526/038', planned_qty: '6x20ft', size: '20ft', trucking: 'MMC',
    lokasi_muat: 'LABUHAN - KIM - CANANG - SP. KANTOR - BGR', created_at: d(15),
    containers: [
      ['EGSU2161037', 'EMCWRT0234', '000492/26', 1296250, 15, 18],
      ['EGSU2328119', 'EMCWRT0244', '000491/26', 0,       15, 18],
      ['EGSU3406622', 'EMCWRT0254', '000494/26', 1296250, 15, 18],
      ['EGSU3623905', 'EMCWRT0264', '000493/26', 0,       15, 18],
      ['EGSU2185126', 'EMCWRT0274', '000496/26', 1296250, 15, 18],
      ['EGSU2215642', 'EMCWRT0284', '000495/26', 0,       15, 18],
    ],
    docs: [
      ['BIAYA LAIN', 'KK26050434',  29, 100000,  'AMPRAH PIL'],
      ['BIAYA LAIN', 'LK26050107C', 18, 750000,  'O CHASIS 3'],
      ['BIAYA LAIN', 'LK26050108C', 19, 20000,   'FULL PANE'],
      ['BIAYA LAIN', 'LK26050108C', 19, 60000,   'EMPTY SUPIR 3'],
      ['BIAYA LAIN', 'LK26050108C', 19, 90000,   'FULL SUPIR 3'],
      ['BIAYA LAIN', 'KK26050416',  21, 50000,   'AMPRAH TGL15/05'],
      ['LIFT ON',    'LK26050104A', 13, 2872000, '6X20'],
      ['LIFT OFF',   'LK26050105A', 15, 1909000, '6X20'],
      ['BIAYA LAIN', 'LK26050105B', 15, 6000,    'ADMOFF'],
      ['BIAYA LAIN', 'LK26050105B', 15, 4000,    'VGM'],
      ['BIAYA LAIN', 'LK26050104C', 13, 4000,    'DO'],
      ['PIUTANG',    '',            20, 2100000, 'BURUH 16MEI'],
    ],
  },
  {
    job_no: '39/V', shipper: 'PT. SUMATERA JAYA LESTARI', commodity: 'WOOD PELLET',
    port_discharge: 'ULSAN', pelayaran: 'NAMSUNG SHIPPING CO.,LTD.', vessel_name: 'SMA KLANG', vessel_no: '6009E',
    bon: '0526/039', planned_qty: '12x20ft', size: '20ft', trucking: 'MMC',
    lokasi_muat: 'TEMBUNG - SAMPALI - SUNGGAL - KP. LALANG - HP. PERAK', created_at: d(15),
    containers: [
      ['NSSU0150252', 'NS2656854', '000626/26', 1276250, 15, 18],
      ['TEMU5751843', 'NS2656801', '000628/26', 2101250, 16, 18],
      ['NSSU0089070', 'NS2656859', '000627/26', 0,       16, 18],
      ['NSSU0186321', 'NS2656810', '000630/26', 2101250, 16, 18],
      ['CAIU6946189', 'NS2656848', '000629/26', 0,       16, 18],
      ['NSSU0166027', 'NS2656819', '000632/26', 2101250, 16, 18],
      ['SEGU3952272', 'NS2656830', '000631/26', 0,       16, 18],
      ['SEKU1399162', 'NS2656832', '000634/26', 2101250, 16, 18],
      ['NSDU2003247', 'NS2656874', '000633/26', 0,       16, 18],
      ['LYGU3130021', 'NS2656888', '000636/26', 2101250, 18, 18],
      ['TLLU3203179', 'NS2656885', '000635/26', 0,       18, 18],
      ['DYLU2158500', 'NS2656872', '000638/26', 1276250, 18, 18],
    ],
    docs: [
      ['PEB',        'KK26050421A', 20, 84000,   '12X20'],
      ['BIAYA LAIN', 'KK26050421B', 20, 22000,   'FC'],
      ['LIFT OFF',   'LK26050104B', 13, 3759000, '12X20'],
      ['BIAYA LAIN', 'LK26050104C', 13, 15000,   'ADMOFF'],
      ['LIFT ON',    'LK26050104A', 13, 5020000, '12X20'],
      ['BIAYA LAIN', 'LK26050104C', 13, 15000,   'ADMON'],
      ['BIAYA LAIN', 'LK26050104C', 13, 4000,    'DO'],
      ['BIAYA LAIN', 'LK26050104C', 13, 12000,   'NPE'],
      ['BIAYA LAIN', 'LK26050104C', 13, 8000,    'VGM'],
      ['BIAYA LAIN', 'LK26050106C', 16, 26000,   'OPRT+TALLY'],
    ],
  },
  {
    job_no: '43/V', shipper: 'PT. METROPOLE PURNAMA CITRA', commodity: 'FURNITURE',
    port_discharge: 'DOHA', pelayaran: 'MCC/MAERSK LINE GROUP', vessel_name: 'GREEN OWL', vessel_no: '619N',
    bon: '0526/043', planned_qty: '1x20ft', size: '20ft', trucking: 'MMC',
    lokasi_muat: 'PATUMBAK - NAMORAMBE - TG. MORAWA - JL. BINJAI', created_at: d(19),
    containers: [
      ['TCLU2341637', 'ML-ID1068533', '000558/26', 1431250, 19, 22],
    ],
    docs: [
      ['PIUTANG',    'KK26050430A', 25, 151400, 'VL MTP 047'],
      ['BIAYA LAIN', 'KK26050434',  29, 75000,  'AMMPRAH'],
      ['BIAYA LAIN', 'LK26050110D', 21, 5000,   'OPTR+ATLLY'],
      ['PEB',        'KK26060446A', 29, 7000,   '1X20'],
      ['LIFT OFF',   'LK26050111A', 22, 506000, '1X20'],
      ['BIAYA LAIN', 'LK26050111B', 22, 6000,   'ADMOFF'],
      ['BIAYA LAIN', 'LK26050111B', 22, 4000,   'VGM'],
      ['BIAYA LAIN', 'LK26050111B', 22, 1000,   'NPE'],
      ['LIFT ON',    'LK26050106A', 16, 550000, '1X20'],
      ['PEB',        '',            30, 30000,  'NOTUL TGL PERK'],
    ],
  },
  {
    job_no: '44/V', shipper: 'PT.INDUSTRI AGRIBISNIS INDONESIA', commodity: 'WOODCHIP',
    port_discharge: 'GWANGYANG', pelayaran: 'MCC/MAERSK LINE GROUP', vessel_name: 'HUA XIN 678', vessel_no: '620N',
    bon: '0526/044', planned_qty: '10x40HC', size: '40HC', trucking: 'MMC',
    lokasi_muat: 'PATUMBAK - NAMORAMBE - TG. MORAWA - JL. BINJAI', created_at: d(19),
    containers: [
      ['TRHU4259787', 'ML-ID1068528', '000574/26', 2002500, 20, 22],
      ['TCNU2058136', 'ML-ID106529',  '000576/26', 2002500, 20, 22],
      ['BEAU6389670', 'ML-ID1068530', '000578/26', 2002500, 20, 22],
      ['SUDU5938566', 'ML-ID1068521', '000560/26', 2002500, 19, 22],
      ['MRSU3848368', 'ML-ID1068522', '000562/26', 2002500, 19, 22],
      ['MRKU2807187', 'ML-ID1068523', '000564/26', 2002500, 19, 22],
      ['MSKU9749335', 'ML-ID1068524', '000566/26', 2002500, 20, 22],
      ['TGBU6646190', 'ML-ID1068525', '000568/26', 2002500, 20, 22],
      ['MRSU3207066', 'ML-ID1068526', '000570/26', 2002500, 20, 22],
      ['CAAU5275843', 'ML-ID1068527', '000572/26', 2002500, 20, 22],
    ],
    docs: [
      ['BIAYA LAIN', 'LK26050109C', 20, 40000,   'OPTR+TALLY DEPO'],
      ['BIAYA LAIN', 'LK26050110D', 21, 70000,   'MINTA NO'],
      ['BIAYA LAIN', 'LK26050108C', 19, 500000,  'U MKN SUPIR 10'],
      ['PEB',        'KK26060438A', 22, 100000,  'AJU'],
      ['BIAYA LAIN', 'KK26060438B', 22, 500000,  'PMRKS BC'],
      ['BIAYA LAIN', 'KK26060438B', 22, 175000,  'U MKN BC'],
      ['BIAYA LAIN', 'KK26060438B', 22, 28000,   'PRINT, MATERAI'],
      ['PEB',        'KK26060441A', 26, 70000,   '10X40'],
      ['BIAYA LAIN', 'LK26050106C', 16, 10000,   'ADMOFF'],
      ['BIAYA LAIN', 'LK26050106C', 16, 10000,   'ADMON'],
      ['LIFT ON',    'LK26050106A', 16, 8000000, '10X40'],
      ['BIAYA LAIN', 'LK26050106C', 16, 4000,    'VGM'],
    ],
  },
  {
    job_no: '45/V', shipper: 'PT. ROYAL PACIFIC INDAH INTERNATIONAL', commodity: 'COFFEE',
    port_discharge: 'HOUSTON', pelayaran: 'MCC/MAERSK LINE GROUP', vessel_name: 'GREEN OWL', vessel_no: '619N',
    bon: '0526/045', planned_qty: '1x20ft', size: '20ft', trucking: 'MMC',
    lokasi_muat: 'PATUMBAK - NAMORAMBE - TG. MORAWA - JL. BINJAI', created_at: d(18),
    containers: [
      ['TEMU1531521', 'ML-ID1063345', '000808/26', 1431250, 18, 22],
    ],
    docs: [
      ['BIAYA LAIN',       'KK26050426D', 22, 14000,   'CTK PHYTO'],
      ['PELANCAR PHYTO',   'KK26050436B', 22, 15000,   'ROYAL 014'],
      ['PHYTOSANITARY',    'KK26050426C', 22, 34600,   'ROYAL 014'],
      ['BIAYA LAIN',       'LK26050110D', 21, 1000,    'NPE'],
      ['QUALITY & WEIGHT', 'KK26050433',  29, 75000,   'WEIGHT'],
      ['PIUTANG',          'KK26060436A', 30, 2045000, 'THC'],
      ['BIAYA LAIN',       'LK26050107C', 18, 6000,    'ADMON'],
      ['LIFT ON',          'LK26050107A', 18, 528000,  '1X20'],
      ['BIAYA LAIN',       'LK26050107C', 18, 10000,   'OPTR+TALLY DEPO'],
      ['LIFT OFF',         'LK26050110B', 21, 506000,  '1X20'],
      ['BIAYA LAIN',       'LK26050110D', 21, 6000,    'ADMOFF'],
      ['PEB',              'KK26060446A', 29, 7000,    '1X20'],
      ['PHYTOSANITARY',    'KK26050424',  20, 300000,  'SPPD ROYL 014'],
      ['PEB',              '',            30, 30000,   'NOTUL TGL PERK'],
    ],
  },
];

// ─── 5. INSERT ─────────────────────────────────────────────────────────────
const insBooking = db.prepare(`
  INSERT INTO bookings (
    job_no, shipper, peb, port, port_discharge, pelayaran, vessel_name, vessel_no,
    bon, status, commodity, planned_qty, lokasi_muat, carrier, tanggal_pelayaran,
    buku_id, public_id, created_by, created_at, updated_at
  ) VALUES (
    @job_no, @shipper, NULL, 'BELAWAN', @port_discharge, @pelayaran, @vessel_name, @vessel_no,
    @bon, 'done', @commodity, @planned_qty, @lokasi_muat, @carrier, '',
    @buku_id, @public_id, 1, @created_at, @created_at
  )
`);
const insContainer = db.prepare(`
  INSERT INTO containers (
    booking_id, container_no, seal_no, size, container_no_2, seal_no_2,
    no_sp, trucking, biaya_trucking, biaya_tambahan, in_date, out_date, notes, created_at
  ) VALUES (
    @booking_id, @container_no, @seal_no, @size, @container_no_2, @seal_no_2,
    @no_sp, @trucking, @biaya_trucking, NULL, @in_date, @out_date, '', datetime('now')
  )
`);

// A biaya_trucking === 0 row is the second box of a 2x20 trucking move: fold it
// into the preceding row as container_no_2/seal_no_2 and bump that row to 2x20.
function pairContainers(rows, defaultSize) {
  const out = [];
  for (const [cont, seal, sp, biaya, inD, outD] of rows) {
    if (biaya === 0 && out.length) {
      const prev = out[out.length - 1];
      prev.size = '2x20';
      prev.container_no_2 = cont;
      prev.seal_no_2 = seal;
      continue;
    }
    out.push({
      container_no: cont, seal_no: seal, size: defaultSize, container_no_2: '', seal_no_2: '',
      no_sp: sp, biaya_trucking: biaya, in_date: d(inD), out_date: d(outD),
    });
  }
  return out;
}
const insDoc = db.prepare(`
  INSERT INTO booking_documents (
    booking_id, doc_type, no_sertifikat, tgl_bon, keterangan, no_job,
    nilai_pembayaran, tipe_pembayaran, created_by, created_at
  ) VALUES (
    @booking_id, @doc_type, @no_sertifikat, @tgl_bon, @keterangan, @no_job,
    @nilai_pembayaran, 'credit', 1, datetime('now')
  )
`);

let nContainers = 0, nDocs = 0;
for (const j of jobs) {
  const bookingId = insBooking.run({
    job_no: j.job_no, shipper: j.shipper, port_discharge: j.port_discharge,
    pelayaran: j.pelayaran, vessel_name: j.vessel_name, vessel_no: j.vessel_no,
    bon: j.bon, commodity: j.commodity, planned_qty: j.planned_qty,
    lokasi_muat: j.lokasi_muat, carrier: j.pelayaran,
    buku_id: bukuId, public_id: crypto.randomUUID(),
    created_at: `${j.created_at}T00:00:00.000Z`,
  }).lastInsertRowid;

  const rows = pairContainers(j.containers, j.size);
  for (const r of rows) {
    insContainer.run({ booking_id: bookingId, trucking: j.trucking, ...r });
    nContainers++;
  }
  for (const [tipe, noSert, tglDay, nilai, ket] of j.docs) {
    insDoc.run({
      booking_id: bookingId, doc_type: tipe, no_sertifikat: noSert,
      tgl_bon: d(tglDay), keterangan: ket, no_job: j.job_no, nilai_pembayaran: nilai,
    });
    nDocs++;
  }
  console.log(`Booking ${j.job_no} → id ${bookingId} | ${rows.length} trucking rows (${j.containers.length} boxes), ${j.docs.length} docs`);
}

// ─── SUMMARY ───────────────────────────────────────────────────────────────
console.log('\n=== IMPORT COMPLETE ===');
console.log('Counts:', {
  bookings:   db.prepare('SELECT COUNT(*) c FROM bookings').get().c,
  containers: nContainers,
  documents:  nDocs,
});
db.close();
