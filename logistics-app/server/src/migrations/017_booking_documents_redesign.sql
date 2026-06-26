-- Redesign booking_documents: unified fields for all 6 doc types
-- Add hutang_dokumen table for finance payment tracking

ALTER TABLE booking_documents RENAME TO booking_documents_old;

CREATE TABLE booking_documents (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id  INTEGER NOT NULL REFERENCES bookings(id),
  doc_type    TEXT NOT NULL CHECK(doc_type IN ('phyto','peb','coo','ico','kadin','certificate')),
  no_dok      TEXT,
  tgl_dok     TEXT,
  no_si       TEXT,
  no_inv      TEXT,
  created_by  INTEGER REFERENCES users(id),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO booking_documents (id, booking_id, doc_type, no_dok, tgl_dok, no_si, no_inv, created_by, created_at)
SELECT
  id,
  booking_id,
  doc_type,
  COALESCE(no_peb, no_phyto),
  tgl,
  no_si,
  no_inv,
  created_by,
  created_at
FROM booking_documents_old;

DROP TABLE booking_documents_old;

CREATE TABLE IF NOT EXISTS hutang_dokumen (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_document_id INTEGER NOT NULL REFERENCES booking_documents(id) ON DELETE CASCADE,
  booking_id          INTEGER NOT NULL REFERENCES bookings(id),
  keterangan          TEXT,
  no_voucher          TEXT,
  tgl_pelunasan       TEXT,
  nilai_pembayaran    INTEGER,
  tgl_pembayaran      TEXT,
  created_by          INTEGER REFERENCES users(id),
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
