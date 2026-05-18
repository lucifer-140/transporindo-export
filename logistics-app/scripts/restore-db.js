import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, existsSync, unlinkSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { createServer } from 'net';

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

const backupFile = process.argv[2];

if (!backupFile) {
  console.error('Usage: node scripts/restore-db.js <backup-file>');
  process.exit(1);
}

const resolvedBackup = backupFile.startsWith('/')
  ? backupFile
  : join(process.cwd(), backupFile);

if (!existsSync(resolvedBackup)) {
  console.error(`✗ Backup file not found: ${resolvedBackup}`);
  process.exit(1);
}

// Validate SQLite magic bytes
const magic = readFileSync(resolvedBackup, { encoding: null }).slice(0, 16).toString('utf8');
if (!magic.startsWith('SQLite format 3')) {
  console.error('✗ File is not a valid SQLite database.');
  process.exit(1);
}

// Check if server port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const tester = createServer()
      .once('error', () => resolve(true))
      .once('listening', () => { tester.close(); resolve(false); })
      .listen(port);
  });
}

const PORT = parseInt(process.env.PORT || '8080', 10);
const inUse = await isPortInUse(PORT);

if (inUse) {
  console.error(`✗ Server appears to be running on port ${PORT}. Stop it before restoring.`);
  process.exit(1);
}

// Prompt for confirmation
const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = await new Promise((resolve) => {
  rl.question(`Restore from:\n  ${resolvedBackup}\nThis will overwrite all current data. Continue? (yes/no): `, resolve);
});
rl.close();

if (answer.trim().toLowerCase() !== 'yes') {
  console.log('Aborted.');
  process.exit(0);
}

// Remove stale WAL files to avoid replay corruption
for (const ext of ['-shm', '-wal']) {
  const f = DB_PATH + ext;
  if (existsSync(f)) {
    unlinkSync(f);
    console.log(`  Removed ${f}`);
  }
}

copyFileSync(resolvedBackup, DB_PATH);

// Verify restore
const db = new DatabaseSync(DB_PATH);
const tables = db.prepare("SELECT count(*) as n FROM sqlite_master WHERE type='table'").get();
db.close();

console.log(`✓ Restored successfully. DB has ${tables.n} tables.`);
console.log(`  Run: npm run migrate   (in server/) to ensure schema is current`);
