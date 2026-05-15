import { getDb } from '../db.js';
import { requireRole } from '../middleware/requireRole.js';

export async function shipperRoutes(fastify) {
  // List all shippers with their commodities and booking count
  fastify.get('/api/shippers', { preHandler: requireRole('worker') }, async () => {
    const db = getDb();
    const shippers = db.prepare(`
      SELECT s.*, COUNT(b.id) AS booking_count,
        COALESCE((
          SELECT SUM(p.jumlah) FROM piutang p
          JOIN bookings bk2 ON bk2.id = p.booking_id
          WHERE bk2.shipper = s.name AND bk2.deleted_at IS NULL
        ), 0) AS total_tagihan
      FROM shippers s
      LEFT JOIN bookings b ON b.shipper = s.name AND b.deleted_at IS NULL
      GROUP BY s.id
      ORDER BY s.name ASC
    `).all();
    const commodities = db.prepare('SELECT * FROM commodities ORDER BY name ASC').all();
    const commodityMap = {};
    for (const c of commodities) {
      (commodityMap[c.shipper_id] ??= []).push(c);
    }
    return shippers.map(s => ({ ...s, commodities: commodityMap[s.id] ?? [] }));
  });

  // Create shipper
  fastify.post('/api/shippers', { preHandler: requireRole('admin') }, async (request, reply) => {
    const { name, commodities = [] } = request.body ?? {};
    if (!name?.trim()) return reply.code(400).send({ error: 'Name required' });
    const db = getDb();
    const insertShipper = db.prepare('INSERT INTO shippers (name) VALUES (?)');
    const insertCommodity = db.prepare('INSERT OR IGNORE INTO commodities (shipper_id, name) VALUES (?, ?)');
    let shipperId;
    try {
      db.exec('BEGIN');
      try {
        const r = insertShipper.run(name.trim());
        shipperId = r.lastInsertRowid;
        for (const c of commodities) {
          if (typeof c === 'string' && c.trim()) insertCommodity.run(shipperId, c.trim());
        }
        db.exec('COMMIT');
      } catch (txErr) {
        try { db.exec('ROLLBACK'); } catch {}
        throw txErr;
      }
    } catch (e) {
      const isUnique = e.code === 'SQLITE_CONSTRAINT_UNIQUE' || String(e.message).includes('UNIQUE');
      return reply.code(isUnique ? 409 : 500).send({ error: isUnique ? 'Shipper already exists' : 'Database error' });
    }
    const shipper = db.prepare('SELECT * FROM shippers WHERE id = ?').get(shipperId);
    const newCommodities = db.prepare('SELECT * FROM commodities WHERE shipper_id = ? ORDER BY name ASC').all(shipperId);
    return reply.code(201).send({ ...shipper, commodities: newCommodities });
  });

  // Delete shipper (cascades to commodities)
  fastify.delete('/api/shippers/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    const db = getDb();
    const result = db.prepare('DELETE FROM shippers WHERE id = ?').run(request.params.id);
    if (result.changes === 0) return reply.code(404).send({ error: 'Not found' });
    return { ok: true };
  });

  // Update shipper name + bulk-replace commodities
  fastify.put('/api/shippers/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    const { name, commodities = [] } = request.body ?? {};
    if (!name?.trim()) return reply.code(400).send({ error: 'Name required' });
    const db = getDb();
    const shipper = db.prepare('SELECT id FROM shippers WHERE id = ?').get(request.params.id);
    if (!shipper) return reply.code(404).send({ error: 'Not found' });
    const updateShipper = db.prepare('UPDATE shippers SET name = ? WHERE id = ?');
    const deleteCommodities = db.prepare('DELETE FROM commodities WHERE shipper_id = ?');
    const insertCommodity = db.prepare('INSERT OR IGNORE INTO commodities (shipper_id, name) VALUES (?, ?)');
    try {
      db.exec('BEGIN');
      try {
        updateShipper.run(name.trim(), shipper.id);
        deleteCommodities.run(shipper.id);
        for (const c of commodities) {
          if (typeof c === 'string' && c.trim()) insertCommodity.run(shipper.id, c.trim());
        }
        db.exec('COMMIT');
      } catch (txErr) {
        try { db.exec('ROLLBACK'); } catch {}
        throw txErr;
      }
    } catch (e) {
      const isUnique = e.code === 'SQLITE_CONSTRAINT_UNIQUE' || String(e.message).includes('UNIQUE');
      return reply.code(isUnique ? 409 : 500).send({ error: isUnique ? 'Nama sudah dipakai' : 'Database error' });
    }
    const updated = db.prepare('SELECT * FROM shippers WHERE id = ?').get(shipper.id);
    const newCommodities = db.prepare('SELECT * FROM commodities WHERE shipper_id = ? ORDER BY name ASC').all(shipper.id);
    return { ...updated, commodities: newCommodities };
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
