CREATE TABLE IF NOT EXISTS dokumen (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id  INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  tipe        TEXT NOT NULL,
  no_dokumen  TEXT,
  biaya       INTEGER NOT NULL DEFAULT 0,
  created_by  INTEGER REFERENCES users(id),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dokumen_booking ON dokumen(booking_id);
