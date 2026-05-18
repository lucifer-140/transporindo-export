import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, mkdirSync, statSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDir = join(__dirname, '..', 'server');

// Parse .env without dotenv dependency
function loadEnv(envPath) {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
loadEnv(join(serverDir, '.env'));

const DB_PATH = process.env.DB_PATH
  ? join(serverDir, process.env.DB_PATH)
  : join(serverDir, 'data', 'app.db');

const BACKUP_DIR = join(dirname(DB_PATH), 'backups');

if (!existsSync(DB_PATH)) {
  console.error(`✗ DB not found: ${DB_PATH}`);
  process.exit(1);
}

// Checkpoint WAL into main DB file before copying
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
db.close();

mkdirSync(BACKUP_DIR, { recursive: true });

const now = new Date();
const ts = now.toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19);
const destPath = join(BACKUP_DIR, `backup-${ts}.db`);

copyFileSync(DB_PATH, destPath);

const size = statSync(destPath).size;
const kb = (size / 1024).toFixed(1);
console.log(`✓ Backup created: ${destPath} (${kb} KB)`);
