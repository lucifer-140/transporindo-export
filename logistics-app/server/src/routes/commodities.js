import { getDb } from '../db.js';
import { requireRole } from '../middleware/requireRole.js';

export async function commodityRoutes(fastify) {
  fastify.get('/api/commodities', { preHandler: requireRole('admin') }, async () => {
    const db = getDb();
    return db.prepare('SELECT * FROM commodities ORDER BY name ASC').all();
  });

  fastify.post('/api/commodities', { preHandler: requireRole('admin') }, async (request, reply) => {
    const { name } = request.body ?? {};
    if (!name?.trim()) return reply.code(400).send({ error: 'Name required' });
    const db = getDb();
    try {
      const result = db.prepare('INSERT INTO commodities (name) VALUES (?)').run(name.trim());
      return reply.code(201).send(db.prepare('SELECT * FROM commodities WHERE id = ?').get(result.lastInsertRowid));
    } catch {
      return reply.code(409).send({ error: 'Commodity already exists' });
    }
  });

}
