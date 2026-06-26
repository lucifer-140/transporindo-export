import { getDb } from '../db.js';
import { requireRole } from '../middleware/requireRole.js';
import { logAudit } from '../utils/audit.js';

const VALID_TYPES = ['phyto', 'peb', 'coo', 'ico', 'kadin', 'certificate'];

export async function bookingDocumentRoutes(fastify) {
  fastify.get('/api/bookings/:id/documents', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT id FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.id);
    if (!booking) return reply.code(404).send({ error: 'Not found' });
    return db.prepare('SELECT * FROM booking_documents WHERE booking_id = ? ORDER BY created_at ASC').all(booking.id);
  });

  fastify.post('/api/bookings/:id/documents', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT id FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.id);
    if (!booking) return reply.code(404).send({ error: 'Not found' });

    const { doc_type, no_dok, tgl_dok, no_si, no_inv } = request.body ?? {};
    if (!VALID_TYPES.includes(doc_type)) return reply.code(400).send({ error: `Invalid doc_type. Must be: ${VALID_TYPES.join(', ')}` });

    const userId = request.session.user.id;
    const result = db.prepare(`
      INSERT INTO booking_documents (booking_id, doc_type, no_dok, tgl_dok, no_si, no_inv, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(booking.id, doc_type, no_dok ?? null, tgl_dok ?? null, no_si ?? null, no_inv ?? null, userId);

    logAudit({ userId, action: 'create', entityType: 'booking_document', entityId: result.lastInsertRowid, changes: request.body });
    return reply.code(201).send(db.prepare('SELECT * FROM booking_documents WHERE id = ?').get(result.lastInsertRowid));
  });

  fastify.put('/api/bookings/:id/documents/:docId', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT id FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.id);
    if (!booking) return reply.code(404).send({ error: 'Not found' });

    const doc = db.prepare('SELECT * FROM booking_documents WHERE id = ? AND booking_id = ?').get(parseInt(request.params.docId), booking.id);
    if (!doc) return reply.code(404).send({ error: 'Not found' });

    const { no_dok, tgl_dok, no_si, no_inv } = request.body ?? {};
    db.prepare('UPDATE booking_documents SET no_dok = ?, tgl_dok = ?, no_si = ?, no_inv = ? WHERE id = ?')
      .run(no_dok ?? null, tgl_dok ?? null, no_si ?? null, no_inv ?? null, doc.id);

    logAudit({ userId: request.session.user.id, action: 'update', entityType: 'booking_document', entityId: doc.id, changes: request.body });
    return db.prepare('SELECT * FROM booking_documents WHERE id = ?').get(doc.id);
  });

  // Finance: get hutang_dokumen entries for all documents of a booking
  fastify.get('/api/bookings/:id/hutang-dokumen', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT id FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.id);
    if (!booking) return reply.code(404).send({ error: 'Not found' });
    return db.prepare(`
      SELECT hd.* FROM hutang_dokumen hd
      JOIN booking_documents bd ON bd.id = hd.booking_document_id
      WHERE bd.booking_id = ?
      ORDER BY hd.created_at ASC
    `).all(booking.id);
  });

  fastify.delete('/api/bookings/:id/documents/:docId', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT id FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.id);
    if (!booking) return reply.code(404).send({ error: 'Not found' });

    const doc = db.prepare('SELECT * FROM booking_documents WHERE id = ? AND booking_id = ?').get(parseInt(request.params.docId), booking.id);
    if (!doc) return reply.code(404).send({ error: 'Not found' });

    db.prepare('DELETE FROM booking_documents WHERE id = ?').run(doc.id);
    logAudit({ userId: request.session.user.id, action: 'delete', entityType: 'booking_document', entityId: doc.id });
    return reply.code(204).send();
  });
}
