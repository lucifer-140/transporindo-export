CREATE TABLE IF NOT EXISTS piutang (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id  INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  jumlah      INTEGER NOT NULL DEFAULT 0,
  keterangan  TEXT,
  created_by  INTEGER REFERENCES users(id),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hutang (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id  INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  pihak       TEXT NOT NULL,
  keterangan  TEXT,
  jumlah      INTEGER NOT NULL DEFAULT 0,
  created_by  INTEGER REFERENCES users(id),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pembayaran (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type  TEXT NOT NULL CHECK(entity_type IN ('piutang','hutang')),
  entity_id    INTEGER NOT NULL,
  jumlah       INTEGER NOT NULL,
  tanggal      TEXT NOT NULL,
  keterangan   TEXT,
  created_by   INTEGER REFERENCES users(id),
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_piutang_booking   ON piutang(booking_id);
CREATE INDEX IF NOT EXISTS idx_hutang_booking    ON hutang(booking_id);
CREATE INDEX IF NOT EXISTS idx_pembayaran_entity ON pembayaran(entity_type, entity_id);
