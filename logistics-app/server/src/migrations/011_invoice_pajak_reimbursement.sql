CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_by INTEGER REFERENCES users(id),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('ppn_rate', '11');

CREATE TABLE IF NOT EXISTS invoice_pajak (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  ppn_rate   INTEGER NOT NULL DEFAULT 11,
  keterangan TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_pajak_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_pajak_id INTEGER NOT NULL REFERENCES invoice_pajak(id) ON DELETE CASCADE,
  keterangan       TEXT NOT NULL,
  harga            INTEGER NOT NULL DEFAULT 0,
  urutan           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS nota_reimbursement (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  keterangan TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nota_reimbursement_items (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  nota_reimbursement_id INTEGER NOT NULL REFERENCES nota_reimbursement(id) ON DELETE CASCADE,
  description           TEXT NOT NULL,
  qty                   INTEGER NOT NULL DEFAULT 1,
  price                 INTEGER NOT NULL DEFAULT 0,
  urutan                INTEGER NOT NULL DEFAULT 0
);
