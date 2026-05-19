CREATE TABLE IF NOT EXISTS booking_documents (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id       INTEGER NOT NULL REFERENCES bookings(id),
  doc_type         TEXT NOT NULL CHECK(doc_type IN ('peb', 'phyto')),
  no_peb           TEXT,
  no_si            TEXT,
  no_inv           TEXT,
  tgl              TEXT,
  no_phyto         TEXT,
  no_pelunasan     TEXT,
  nilai_pelunasan  INTEGER,
  tgl_pelunasan    TEXT,
  created_by       INTEGER REFERENCES users(id),
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
