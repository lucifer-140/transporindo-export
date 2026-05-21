ALTER TABLE bookings RENAME COLUMN feeder TO pelayaran;
ALTER TABLE containers ADD COLUMN no_sp  TEXT;
ALTER TABLE containers ADD COLUMN vendor TEXT;
ALTER TABLE containers ADD COLUMN notes  TEXT;
