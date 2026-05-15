ALTER TABLE bookings ADD COLUMN public_id TEXT;
UPDATE bookings SET public_id = lower(hex(randomblob(16))) WHERE public_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_public_id ON bookings(public_id);
