CREATE TABLE IF NOT EXISTS hutang_trucking_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hutang_id INTEGER NOT NULL REFERENCES hutang(id) ON DELETE CASCADE,
  keterangan TEXT,
  no_voucher TEXT,
  tgl_pelunasan TEXT,
  nilai_pembayaran INTEGER,
  tgl_pembayaran TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
