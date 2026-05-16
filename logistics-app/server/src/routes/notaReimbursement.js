import { getDb } from '../db.js';
import { logAudit } from '../utils/audit.js';
import { z } from 'zod';
import { requireRole } from '../middleware/requireRole.js';
import { isBukuClosed } from '../utils/bukuGuard.js';

const headerSchema = z.object({
  keterangan: z.string().optional().default(''),
});

const itemSchema = z.object({
  description: z.string().min(1),
  qty:         z.number().int().min(1),
  price:       z.number().int().min(0),
  urutan:      z.number().int().min(0).optional().default(0),
});

function buildNota(db, row) {
  const items = db.prepare(
    'SELECT * FROM nota_reimbursement_items WHERE nota_reimbursement_id = ? ORDER BY urutan ASC, id ASC'
  ).all(row.id).map(i => ({ ...i, amount: i.qty * i.price }));

  const total = items.reduce((s, i) => s + i.amount, 0);
  return { ...row, items, total };
}

export async function notaReimbursementRoutes(fastify) {
  // GET nota reimbursement for booking
  fastify.get('/api/bookings/:bookingId/nota-reimbursement', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT id FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.bookingId);
    if (!booking) return reply.code(404).send({ error: 'Booking not found' });

    const row = db.prepare('SELECT * FROM nota_reimbursement WHERE booking_id = ?').get(booking.id);
    if (!row) return reply.send(null);
    return buildNota(db, row);
  });

  // CREATE nota reimbursement
  fastify.post('/api/bookings/:bookingId/nota-reimbursement', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT id, buku_id FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.bookingId);
    if (!booking) return reply.code(404).send({ error: 'Booking not found' });
    if (isBukuClosed(booking.buku_id)) return reply.code(409).send({ error: 'buku_closed' });

    const existing = db.prepare('SELECT id FROM nota_reimbursement WHERE booking_id = ?').get(booking.id);
    if (existing) return reply.code(409).send({ error: 'Nota reimbursement already exists for this booking' });

    const parsed = headerSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const result = db.prepare(
      'INSERT INTO nota_reimbursement (booking_id, keterangan, created_by) VALUES (?, ?, ?)'
    ).run(booking.id, parsed.data.keterangan, request.session.user.id);

    logAudit({ userId: request.session.user.id, action: 'create', entityType: 'nota_reimbursement', entityId: result.lastInsertRowid, changes: parsed.data });

    const row = db.prepare('SELECT * FROM nota_reimbursement WHERE id = ?').get(result.lastInsertRowid);
    return reply.code(201).send(buildNota(db, row));
  });

  // UPDATE nota header
  fastify.put('/api/bookings/:bookingId/nota-reimbursement/:id', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const row = db.prepare('SELECT nr.*, b.buku_id FROM nota_reimbursement nr JOIN bookings b ON b.id = nr.booking_id WHERE nr.id = ?').get(request.params.id);
    if (!row) return reply.code(404).send({ error: 'Not found' });
    if (isBukuClosed(row.buku_id)) return reply.code(409).send({ error: 'buku_closed' });

    const parsed = headerSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    db.prepare('UPDATE nota_reimbursement SET keterangan = ? WHERE id = ?').run(parsed.data.keterangan, row.id);

    logAudit({ userId: request.session.user.id, action: 'update', entityType: 'nota_reimbursement', entityId: row.id, changes: parsed.data });
    return buildNota(db, db.prepare('SELECT * FROM nota_reimbursement WHERE id = ?').get(row.id));
  });

  // DELETE nota reimbursement (cascades items)
  fastify.delete('/api/bookings/:bookingId/nota-reimbursement/:id', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const row = db.prepare('SELECT nr.*, b.buku_id FROM nota_reimbursement nr JOIN bookings b ON b.id = nr.booking_id WHERE nr.id = ?').get(request.params.id);
    if (!row) return reply.code(404).send({ error: 'Not found' });
    if (isBukuClosed(row.buku_id)) return reply.code(409).send({ error: 'buku_closed' });

    db.prepare('DELETE FROM nota_reimbursement WHERE id = ?').run(row.id);
    logAudit({ userId: request.session.user.id, action: 'delete', entityType: 'nota_reimbursement', entityId: row.id });
    return reply.code(204).send();
  });

  // ADD line item
  fastify.post('/api/bookings/:bookingId/nota-reimbursement/:id/items', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const row = db.prepare('SELECT nr.*, b.buku_id FROM nota_reimbursement nr JOIN bookings b ON b.id = nr.booking_id WHERE nr.id = ?').get(request.params.id);
    if (!row) return reply.code(404).send({ error: 'Not found' });
    if (isBukuClosed(row.buku_id)) return reply.code(409).send({ error: 'buku_closed' });

    const parsed = itemSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    db.prepare('INSERT INTO nota_reimbursement_items (nota_reimbursement_id, description, qty, price, urutan) VALUES (?, ?, ?, ?, ?)').run(row.id, parsed.data.description, parsed.data.qty, parsed.data.price, parsed.data.urutan);

    return reply.code(201).send(buildNota(db, db.prepare('SELECT * FROM nota_reimbursement WHERE id = ?').get(row.id)));
  });

  // UPDATE line item
  fastify.put('/api/bookings/:bookingId/nota-reimbursement/:id/items/:itemId', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const row = db.prepare('SELECT nr.*, b.buku_id FROM nota_reimbursement nr JOIN bookings b ON b.id = nr.booking_id WHERE nr.id = ?').get(request.params.id);
    if (!row) return reply.code(404).send({ error: 'Not found' });
    if (isBukuClosed(row.buku_id)) return reply.code(409).send({ error: 'buku_closed' });

    const item = db.prepare('SELECT * FROM nota_reimbursement_items WHERE id = ? AND nota_reimbursement_id = ?').get(request.params.itemId, row.id);
    if (!item) return reply.code(404).send({ error: 'Item not found' });

    const parsed = itemSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    db.prepare('UPDATE nota_reimbursement_items SET description = ?, qty = ?, price = ?, urutan = ? WHERE id = ?').run(parsed.data.description, parsed.data.qty, parsed.data.price, parsed.data.urutan, item.id);

    return buildNota(db, db.prepare('SELECT * FROM nota_reimbursement WHERE id = ?').get(row.id));
  });

  // DELETE line item
  fastify.delete('/api/bookings/:bookingId/nota-reimbursement/:id/items/:itemId', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const row = db.prepare('SELECT nr.*, b.buku_id FROM nota_reimbursement nr JOIN bookings b ON b.id = nr.booking_id WHERE nr.id = ?').get(request.params.id);
    if (!row) return reply.code(404).send({ error: 'Not found' });
    if (isBukuClosed(row.buku_id)) return reply.code(409).send({ error: 'buku_closed' });

    const item = db.prepare('SELECT * FROM nota_reimbursement_items WHERE id = ? AND nota_reimbursement_id = ?').get(request.params.itemId, row.id);
    if (!item) return reply.code(404).send({ error: 'Item not found' });

    db.prepare('DELETE FROM nota_reimbursement_items WHERE id = ?').run(item.id);
    return buildNota(db, db.prepare('SELECT * FROM nota_reimbursement WHERE id = ?').get(row.id));
  });
}
