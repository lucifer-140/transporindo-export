import { getDb } from '../db.js';
import { requireRole } from '../middleware/requireRole.js';

export async function shipperRoutes(fastify) {
  // List all shippers with their commodities
  fastify.get('/api/shippers', { preHandler: requireRole('admin') }, async () => {
    const db = getDb();
    const shippers = db.prepare('SELECT * FROM shippers ORDER BY name ASC').all();
    const commodities = db.prepare('SELECT * FROM commodities ORDER BY name ASC').all();
    return shippers.map(s => ({
      ...s,
      commodities: commodities.filter(c => c.shipper_id === s.id),
    }));
  });

  // Create shipper
  fastify.post('/api/shippers', { preHandler: requireRole('admin') }, async (request, reply) => {
    const { name } = request.body ?? {};
    if (!name?.trim()) return reply.code(400).send({ error: 'Name required' });
    const db = getDb();
    try {
      const result = db.prepare('INSERT INTO shippers (name) VALUES (?)').run(name.trim());
      const shipper = db.prepare('SELECT * FROM shippers WHERE id = ?').get(result.lastInsertRowid);
      return reply.code(201).send({ ...shipper, commodities: [] });
    } catch {
      return reply.code(409).send({ error: 'Shipper already exists' });
    }
  });

  // Delete shipper (cascades to commodities)
  fastify.delete('/api/shippers/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    const db = getDb();
    const result = db.prepare('DELETE FROM shippers WHERE id = ?').run(request.params.id);
    if (result.changes === 0) return reply.code(404).send({ error: 'Not found' });
    return { ok: true };
  });

  // Add commodity to shipper
  fastify.post('/api/shippers/:id/commodities', { preHandler: requireRole('admin') }, async (request, reply) => {
    const { name } = request.body ?? {};
    if (!name?.trim()) return reply.code(400).send({ error: 'Name required' });
    const db = getDb();
    const shipper = db.prepare('SELECT id FROM shippers WHERE id = ?').get(request.params.id);
    if (!shipper) return reply.code(404).send({ error: 'Shipper not found' });
    try {
      const result = db.prepare('INSERT INTO commodities (shipper_id, name) VALUES (?, ?)').run(shipper.id, name.trim());
      return reply.code(201).send(db.prepare('SELECT * FROM commodities WHERE id = ?').get(result.lastInsertRowid));
    } catch {
      return reply.code(409).send({ error: 'Commodity already exists for this shipper' });
    }
  });

  // Remove commodity
  fastify.delete('/api/commodities/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    const db = getDb();
    const result = db.prepare('DELETE FROM commodities WHERE id = ?').run(request.params.id);
    if (result.changes === 0) return reply.code(404).send({ error: 'Not found' });
    return { ok: true };
  });
}
