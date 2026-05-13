// Usage: node scripts/seed-admin.js <username> <password>
import { getDb } from '../server/src/db.js';
import { hash } from '../server/src/utils/password.js';

const [,, username, password] = process.argv;

if (!username || !password || password.length < 8) {
  console.error('Usage: node scripts/seed-admin.js <username> <password (min 8 chars)>');
  process.exit(1);
}

const db = getDb();
const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
if (existing) {
  console.error(`User "${username}" already exists.`);
  process.exit(1);
}

const password_hash = await hash(password);
db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, password_hash, 'admin');
console.log(`Admin user "${username}" created.`);
