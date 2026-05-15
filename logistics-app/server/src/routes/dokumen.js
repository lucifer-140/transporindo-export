import { getDb } from '../db.js';
import { logAudit } from '../utils/audit.js';
import { z } from 'zod';
import { requireRole } from '../middleware/requireRole.js';
import { isBukuClosed } from '../utils/bukuGuard.js';

const dokumenSchema = z.object({
  tipe: z.string().min(1),
  no_dokumen: z.string().optional().default(''),
  qty: z.number().int().min(1).default(1),
  harga_satuan: z.number().int().min(0).default(0),
});

export async function dokumenRoutes(fastify) {
  // List dokumen for a booking
  fastify.get('/api/bookings/:bookingId/dokumen', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT id FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.bookingId);
    if (!booking) return reply.code(404).send({ error: 'Booking not found' });
    return db.prepare('SELECT * FROM dokumen WHERE booking_id = ? ORDER BY created_at ASC').all(booking.id);
  });

  // Add dokumen
  fastify.post('/api/bookings/:bookingId/dokumen', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT id, buku_id FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.bookingId);
    if (!booking) return reply.code(404).send({ error: 'Booking not found' });
    if (isBukuClosed(booking.buku_id)) return reply.code(409).send({ error: 'buku_closed' });

    const parsed = dokumenSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { tipe, no_dokumen, qty, harga_satuan } = parsed.data;
    const biaya = qty * harga_satuan;
    const userId = request.session.user.id;
    const result = db.prepare(
      'INSERT INTO dokumen (booking_id, tipe, no_dokumen, qty, harga_satuan, biaya, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(booking.id, tipe, no_dokumen, qty, harga_satuan, biaya, userId);

    logAudit({ userId, action: 'create', entityType: 'dokumen', entityId: result.lastInsertRowid, changes: parsed.data });

    return reply.code(201).send(db.prepare('SELECT * FROM dokumen WHERE id = ?').get(result.lastInsertRowid));
  });

  // Update dokumen
  fastify.put('/api/bookings/:bookingId/dokumen/:id', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT id, buku_id FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.bookingId);
    if (!booking) return reply.code(404).send({ error: 'Booking not found' });
    if (isBukuClosed(booking.buku_id)) return reply.code(409).send({ error: 'buku_closed' });
    const existing = db.prepare('SELECT * FROM dokumen WHERE id = ? AND booking_id = ?').get(request.params.id, booking.id);
    if (!existing) return reply.code(404).send({ error: 'Not found' });

    const parsed = dokumenSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { tipe, no_dokumen, qty, harga_satuan } = parsed.data;
    const biaya = qty * harga_satuan;
    db.prepare('UPDATE dokumen SET tipe = ?, no_dokumen = ?, qty = ?, harga_satuan = ?, biaya = ? WHERE id = ?').run(tipe, no_dokumen, qty, harga_satuan, biaya, existing.id);

    logAudit({ userId: request.session.user.id, action: 'update', entityType: 'dokumen', entityId: existing.id, changes: parsed.data });

    return db.prepare('SELECT * FROM dokumen WHERE id = ?').get(existing.id);
  });

  // Delete dokumen
  fastify.delete('/api/bookings/:bookingId/dokumen/:id', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT id, buku_id FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.bookingId);
    if (!booking) return reply.code(404).send({ error: 'Booking not found' });
    if (isBukuClosed(booking.buku_id)) return reply.code(409).send({ error: 'buku_closed' });
    const existing = db.prepare('SELECT * FROM dokumen WHERE id = ? AND booking_id = ?').get(request.params.id, booking.id);
    if (!existing) return reply.code(404).send({ error: 'Not found' });

    db.prepare('DELETE FROM dokumen WHERE id = ?').run(existing.id);
    logAudit({ userId: request.session.user.id, action: 'delete', entityType: 'dokumen', entityId: existing.id });
    return reply.code(204).send();
  });
}
