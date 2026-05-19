import { getDb } from '../db.js';
import { requireRole } from '../middleware/requireRole.js';
import { logAudit } from '../utils/audit.js';

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
    logAudit({ userId: request.session.user.id, action: 'create', entityType: 'shipper', entityId: shipperId, changes: { name: name.trim() } });
    return reply.code(201).send({ ...shipper, commodities: newCommodities });
  });

  // Delete shipper (cascades to commodities)
  fastify.delete('/api/shippers/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    const db = getDb();
    const existing = db.prepare('SELECT id, name FROM shippers WHERE id = ?').get(request.params.id);
    if (!existing) return reply.code(404).send({ error: 'Not found' });
    db.prepare('DELETE FROM shippers WHERE id = ?').run(existing.id);
    logAudit({ userId: request.session.user.id, action: 'delete', entityType: 'shipper', entityId: existing.id, changes: { name: existing.name } });
    return { ok: true };
  });

  // Update shipper name + commodities
  // commodities: [{id?, name}] — items with id are renamed; items without id are new
  fastify.put('/api/shippers/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    const { name, commodities = [] } = request.body ?? {};
    if (!name?.trim()) return reply.code(400).send({ error: 'Name required' });
    const db = getDb();
    const shipper = db.prepare('SELECT id, name FROM shippers WHERE id = ?').get(request.params.id);
    if (!shipper) return reply.code(404).send({ error: 'Not found' });

    const oldCommodities = db.prepare('SELECT * FROM commodities WHERE shipper_id = ?').all(shipper.id);
    const incomingIds = new Set(commodities.filter(c => c.id).map(c => Number(c.id)));
    const toDelete = oldCommodities.filter(c => !incomingIds.has(c.id));
    const newShipperName = name.trim();

    try {
      db.exec('BEGIN');
      try {
        if (newShipperName !== shipper.name) {
          db.prepare('UPDATE shippers SET name = ? WHERE id = ?').run(newShipperName, shipper.id);
          db.prepare('UPDATE bookings SET shipper = ? WHERE shipper = ?').run(newShipperName, shipper.name);
        }
        const updateCom = db.prepare('UPDATE commodities SET name = ? WHERE id = ? AND shipper_id = ?');
        const updateBookingCom = db.prepare('UPDATE bookings SET commodity = ? WHERE shipper = ? AND commodity = ?');
        for (const c of commodities) {
          if (!c.id) continue;
          const old = oldCommodities.find(o => o.id === Number(c.id));
          if (old && old.name !== c.name.trim()) {
            updateCom.run(c.name.trim(), old.id, shipper.id);
            updateBookingCom.run(c.name.trim(), newShipperName, old.name);
          }
        }
        const insertCom = db.prepare('INSERT OR IGNORE INTO commodities (shipper_id, name) VALUES (?, ?)');
        for (const c of commodities) {
          if (!c.id && c.name?.trim()) insertCom.run(shipper.id, c.name.trim());
        }
        const deleteCom = db.prepare('DELETE FROM commodities WHERE id = ?');
        for (const c of toDelete) deleteCom.run(c.id);
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
    logAudit({ userId: request.session.user.id, action: 'update', entityType: 'shipper', entityId: shipper.id, changes: { name: newShipperName, commodities: newCommodities.map(c => c.name) } });
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
      logAudit({ userId: request.session.user.id, action: 'create', entityType: 'commodity', entityId: result.lastInsertRowid, changes: { shipper_id: shipper.id, name: name.trim() } });
      return reply.code(201).send(db.prepare('SELECT * FROM commodities WHERE id = ?').get(result.lastInsertRowid));
    } catch {
      return reply.code(409).send({ error: 'Commodity already exists for this shipper' });
    }
  });

  // Remove commodity
  fastify.delete('/api/commodities/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    const db = getDb();
    const existing = db.prepare('SELECT id, name, shipper_id FROM commodities WHERE id = ?').get(request.params.id);
    if (!existing) return reply.code(404).send({ error: 'Not found' });
    db.prepare('DELETE FROM commodities WHERE id = ?').run(existing.id);
    logAudit({ userId: request.session.user.id, action: 'delete', entityType: 'commodity', entityId: existing.id, changes: { name: existing.name, shipper_id: existing.shipper_id } });
    return { ok: true };
  });
}
