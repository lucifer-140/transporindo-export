PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'worker',
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  job_no        TEXT NOT NULL,
  shipper       TEXT NOT NULL,
  peb           TEXT,
  port          TEXT,
  feeder        TEXT,
  vessel_name   TEXT,
  vessel_no     TEXT,
  bon           TEXT,
  status        TEXT NOT NULL DEFAULT 'in_progress',
  notes         TEXT,
  created_by    INTEGER REFERENCES users(id),
  deleted_at    DATETIME,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS containers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id    INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  container_no  TEXT NOT NULL,
  seal_no       TEXT,
  size          TEXT NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER REFERENCES users(id),
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     INTEGER,
  changes       TEXT,
  timestamp     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  sid     TEXT PRIMARY KEY,
  sess    TEXT NOT NULL,
  expired DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookings_job_no     ON bookings(job_no);
CREATE INDEX IF NOT EXISTS idx_bookings_shipper    ON bookings(shipper);
CREATE INDEX IF NOT EXISTS idx_bookings_status     ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_containers_no       ON containers(container_no);
CREATE INDEX IF NOT EXISTS idx_containers_booking  ON containers(booking_id);

CREATE TRIGGER IF NOT EXISTS bookings_updated_at AFTER UPDATE ON bookings
BEGIN
  UPDATE bookings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
