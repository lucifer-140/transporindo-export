import { getDb } from '../db.js';

export function logAudit({ userId, action, entityType, entityId, changes }) {
  const db = getDb();
  db.prepare(`
    INSERT INTO audit_log (user_id, action, entity_type, entity_id, changes)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId ?? null, action, entityType, entityId ?? null, changes ? JSON.stringify(changes) : null);
}
