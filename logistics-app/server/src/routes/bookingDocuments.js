import { getDb } from '../db.js';
import { requireRole } from '../middleware/requireRole.js';
import { logAudit } from '../utils/audit.js';

const VALID_TYPES = ['peb', 'phyto'];

export async function bookingDocumentRoutes(fastify) {
  // List documents for a booking
  fastify.get('/api/bookings/:id/documents', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT id FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.id);
    if (!booking) return reply.code(404).send({ error: 'Not found' });
    return db.prepare('SELECT * FROM booking_documents WHERE booking_id = ? ORDER BY created_at ASC').all(booking.id);
  });

  // Add a document
  fastify.post('/api/bookings/:id/documents', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT id FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.id);
    if (!booking) return reply.code(404).send({ error: 'Not found' });

    const { doc_type, no_peb, no_si, no_inv, tgl, no_phyto, no_pelunasan, nilai_pelunasan, tgl_pelunasan } = request.body ?? {};
    if (!VALID_TYPES.includes(doc_type)) return reply.code(400).send({ error: 'Invalid doc_type. Must be: peb, phyto' });

    const userId = request.session.user.id;
    const result = db.prepare(`
      INSERT INTO booking_documents
        (booking_id, doc_type, no_peb, no_si, no_inv, tgl, no_phyto, no_pelunasan, nilai_pelunasan, tgl_pelunasan, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      booking.id, doc_type,
      no_peb ?? null, no_si ?? null, no_inv ?? null, tgl ?? null,
      no_phyto ?? null,
      no_pelunasan ?? null, nilai_pelunasan ? parseInt(nilai_pelunasan) : null, tgl_pelunasan ?? null,
      userId
    );

    logAudit({ userId, action: 'create', entityType: 'booking_document', entityId: result.lastInsertRowid, changes: request.body });
    return reply.code(201).send(db.prepare('SELECT * FROM booking_documents WHERE id = ?').get(result.lastInsertRowid));
  });

  // Update a document
  fastify.put('/api/bookings/:id/documents/:docId', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT id FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.id);
    if (!booking) return reply.code(404).send({ error: 'Not found' });

    const doc = db.prepare('SELECT * FROM booking_documents WHERE id = ? AND booking_id = ?').get(parseInt(request.params.docId), booking.id);
    if (!doc) return reply.code(404).send({ error: 'Not found' });

    const { no_peb, no_si, no_inv, tgl, no_phyto, no_pelunasan, nilai_pelunasan, tgl_pelunasan } = request.body ?? {};
    db.prepare(`
      UPDATE booking_documents SET
        no_peb = ?, no_si = ?, no_inv = ?, tgl = ?,
        no_phyto = ?,
        no_pelunasan = ?, nilai_pelunasan = ?, tgl_pelunasan = ?
      WHERE id = ?
    `).run(
      no_peb ?? null, no_si ?? null, no_inv ?? null, tgl ?? null,
      no_phyto ?? null,
      no_pelunasan ?? null, nilai_pelunasan ? parseInt(nilai_pelunasan) : null, tgl_pelunasan ?? null,
      doc.id
    );

    logAudit({ userId: request.session.user.id, action: 'update', entityType: 'booking_document', entityId: doc.id, changes: request.body });
    return db.prepare('SELECT * FROM booking_documents WHERE id = ?').get(doc.id);
  });

  // Delete a document
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
