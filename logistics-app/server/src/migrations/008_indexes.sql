CREATE INDEX IF NOT EXISTS idx_bookings_deleted_at ON bookings(deleted_at);
CREATE INDEX IF NOT EXISTS idx_bookings_deleted_status ON bookings(deleted_at, status);
CREATE INDEX IF NOT EXISTS idx_piutang_booking_id ON piutang(booking_id);
CREATE INDEX IF NOT EXISTS idx_hutang_booking_id ON hutang(booking_id);
CREATE INDEX IF NOT EXISTS idx_pembayaran_entity ON pembayaran(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_containers_booking_id ON containers(booking_id);
