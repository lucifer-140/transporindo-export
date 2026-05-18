import { getDb } from '../db.js';
import { requireRole } from '../middleware/requireRole.js';
import { logAudit } from '../utils/audit.js';

export async function settingsRoutes(fastify) {
  fastify.get('/api/settings', { preHandler: requireRole('admin') }, async () => {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM app_settings').all();
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  });

  fastify.put('/api/settings/:key', { preHandler: requireRole('admin') }, async (request, reply) => {
    const db = getDb();
    const { key } = request.params;
    const { value } = request.body ?? {};
    if (value === undefined || value === null) return reply.code(400).send({ error: 'value required' });

    db.prepare('INSERT INTO app_settings (key, value, updated_by, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at')
      .run(key, String(value), request.session.user.id);

    logAudit({ userId: request.session.user.id, action: 'update', entityType: 'setting', entityId: null, changes: { key, value: String(value) } });
    return { key, value: String(value) };
  });
}
