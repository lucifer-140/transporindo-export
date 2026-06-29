// Tarif Angkutan master data (Sept 2022 tariff).
//
// MMC & TAS use the MAIN tariff table (`main`, columns 1x20'/1x40'/2x20').
// Other truckers (SP2/SSG/BBT, HW, LJR) use the SECONDARY table, attached to the
// matching lokasi rows. Prices not defined → null (user types manually).
//
// Size mapping: '20ft' → 20', '40ft'/'40HC' → 40', '2x20' → 2x20'.

export const TARIF = [
  { id: '1a', lokasi: 'SMART, TPI, BLW SEKITARNYA',                         main: { '20ft': 715000,   '40ft': 892500,   '2x20': 1196250 } },
  { id: '1b', lokasi: 'CANANG EXPORT',                                      main: { '20ft': 645000,   '40ft': 820000,   '2x20': 945000 },
              'SP2/SSG/BBT': { '40ft': 850000 }, LJR: { '40ft': 906250 } },
  { id: '1c', lokasi: 'LANGSIR DEPO LSG TRN CONTAINER',                     main: { '20ft': 536250,   '40ft': 715000,   '2x20': 848750 } },
  { id: '2',  lokasi: 'LABUHAN - KIM - CANANG - SP. KANTOR - BGR',          main: { '20ft': 892500,   '40ft': 1283750,  '2x20': 1495000 } },
  { id: '3',  lokasi: 'TITIPAPAN - KOTA BANGUN - TERJUN - SBU - MABAR',     main: { '20ft': 1017500,  '40ft': 1392500,  '2x20': 1657500 } },
  { id: '4',  lokasi: 'HELVETIA - CEMARA - KRAKATAU - K. PUTIH - P.BRAYAN', main: { '20ft': 1116250,  '40ft': 1525000,  '2x20': 1828750 } },
  { id: '5',  lokasi: 'TEMBUNG - SAMPALI - SUNGGAL - KP. LALANG - HP. PERAK', main: { '20ft': 1276250, '40ft': 1828750, '2x20': 2101250 },
              'SP2/SSG/BBT': { '20ft': 1450000, '40ft': 1850000 } },
  { id: '6',  lokasi: 'PATUMBAK - NAMORAMBE - TG. MORAWA - JL. BINJAI',     main: { '20ft': 1431250,  '40ft': 2002500,  '2x20': 2400000 },
              'SP2/SSG/BBT': { '20ft': 1625000, '40ft': 1950000 }, HW: { '20ft': 1500000, '40ft': 1875000 }, LJR: { '20ft': 1687500, '40ft': 1875000 } },
  { id: '7',  lokasi: 'AMPLAS S/D POLDASU',                                 main: { '20ft': 1276250,  '40ft': 1828750,  '2x20': 2101250 } },
  { id: '8',  lokasi: 'PANCUR BATU - L. PAKAM - PERBAUNGAN - BINJAI - TANDEM', main: { '20ft': 1793750, '40ft': 2248750, '2x20': 2828750 } },
  { id: '9',  lokasi: 'SEIRAMPAH - T.TINGGI - STABAT - TG. PURA',           main: { '20ft': 2690000,  '40ft': 3075000,  '2x20': 3880000 } },
  { id: '10', lokasi: 'P. SIANTAR - K. TANJUNG - L.PULUH - PERDAGANGAN - P.SUSU', main: { '20ft': 3275000, '40ft': 4052500, '2x20': 4792500 },
              HW: { '40ft': 3500000 } },
  { id: '11', lokasi: 'KISARAN - TG. BALAI',                                main: { '20ft': 3983750,  '40ft': 4980000,  '2x20': 6090000 } },
  { id: '12', lokasi: 'BRASTAGI',                                           main: { '20ft': 4281250,  '40ft': 6268750,  '2x20': 6840000 } },
  { id: '13', lokasi: 'KABANJAHE',                                          main: { '20ft': 4757500,  '40ft': 6840000,  '2x20': 7295000 } },
  { id: '14', lokasi: 'AEK KANOPAN',                                        main: { '20ft': 6662500,  '40ft': 9120000,  '2x20': null } },
  { id: '15', lokasi: 'RANTAU PRAPAT',                                      main: { '20ft': 9038750,  '40ft': 10258750, '2x20': null } },
  { id: '16', lokasi: 'BANDA ACEH',                                         main: { '20ft': 14267500, '40ft': 18262500, '2x20': null } },
  { id: '17', lokasi: 'SIGODANG VIA SIANTAR',                               main: { '20ft': null,     '40ft': 5576250,  '2x20': null } },
  { id: '18', lokasi: 'PEKAN BARU',                                         main: { '20ft': 14981250, '40ft': 17263750, '2x20': null } },
];

// Trucking vendors. MMC & TAS price off the main table; the rest off the secondary.
export const TRUCKING_OPTIONS = ['MMC', 'TAS', 'SP2/SSG/BBT', 'HW', 'LJR'];

// Lokasi Muat options for the booking form.
export const LOKASI_OPTIONS = TARIF.map(r => r.lokasi);

function sizeCol(size) {
  if (size === '20ft') return '20ft';
  if (size === '2x20') return '2x20';
  return '40ft'; // 40ft, 40HC
}

// Resolve biaya trucking for a (lokasi, trucking, size) combo. Returns number or null.
export function getTarif(lokasi, trucking, size) {
  const row = TARIF.find(r => r.lokasi === lokasi);
  if (!row) return null;
  const key = trucking === 'MMC' || trucking === 'TAS' ? 'main' : trucking;
  return row[key]?.[sizeCol(size)] ?? null;
}
