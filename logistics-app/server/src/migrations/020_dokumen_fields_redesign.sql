-- 020: Dokumen fields redesign (v0.19.0 simplification)
-- New booking_documents field set. doc_type kept (= Tipe Dokumen / Jenis Dokumen).
-- Old invoice-style columns (no_dok, tgl_dok, no_si, no_inv) left dormant in DB;
-- dropped from UI/API. Additive ALTERs (idempotent via try/catch in db.js runner).
-- tipe_pembayaran constrained to 'cash' | 'credit' at the API/UI layer.

ALTER TABLE booking_documents ADD COLUMN no_sertifikat    TEXT;
ALTER TABLE booking_documents ADD COLUMN tgl_bon          TEXT;
ALTER TABLE booking_documents ADD COLUMN keterangan       TEXT;
ALTER TABLE booking_documents ADD COLUMN no_job           TEXT;
ALTER TABLE booking_documents ADD COLUMN nilai_pembayaran INTEGER;
ALTER TABLE booking_documents ADD COLUMN tipe_pembayaran  TEXT;
