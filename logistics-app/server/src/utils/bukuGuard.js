import { getDb } from '../db.js';

export function isBukuClosed(buku_id) {
  if (!buku_id) return false;
  const db = getDb();
  const buku = db.prepare('SELECT status FROM buku WHERE id = ?').get(buku_id);
  return buku?.status === 'closed';
}
