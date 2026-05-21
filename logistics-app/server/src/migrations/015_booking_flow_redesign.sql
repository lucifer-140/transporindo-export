ALTER TABLE bookings ADD COLUMN lokasi_muat TEXT;
ALTER TABLE containers RENAME COLUMN vendor TO trucking;
ALTER TABLE containers ADD COLUMN biaya_trucking INTEGER;
ALTER TABLE containers ADD COLUMN in_date        TEXT;
ALTER TABLE containers ADD COLUMN out_date       TEXT;
