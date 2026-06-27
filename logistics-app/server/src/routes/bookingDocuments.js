import { getDb } from '../db.js';
import { requireRole } from '../middleware/requireRole.js';
import { logAudit } from '../utils/audit.js';

// doc_type is now a free-form master-list value (Tipe Dokumen) — any non-empty
// string is accepted so the list can grow without a schema/code change.
const VALID_PAYMENT = ['cash', 'credit'];

// Coerce nilai_pembayaran to integer or null
function toIntOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function normPayment(v) {
  return VALID_PAYMENT.includes(v) ? v : null;
}

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

    const { doc_type, no_sertifikat, tgl_bon, keterangan, no_job, nilai_pembayaran, tipe_pembayaran } = request.body ?? {};
    if (!doc_type || typeof doc_type !== 'string' || doc_type.trim() === '') return reply.code(400).send({ error: 'doc_type (Tipe Dokumen) wajib diisi.' });

    const userId = request.session.user.id;
    const result = db.prepare(`
      INSERT INTO booking_documents (booking_id, doc_type, no_sertifikat, tgl_bon, keterangan, no_job, nilai_pembayaran, tipe_pembayaran, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      booking.id, doc_type,
      no_sertifikat ?? null, tgl_bon ?? null, keterangan ?? null, no_job ?? null,
      toIntOrNull(nilai_pembayaran), normPayment(tipe_pembayaran), userId
    );

    logAudit({ userId, action: 'create', entityType: 'booking_document', entityId: result.lastInsertRowid, changes: request.body });
    return reply.code(201).send(db.prepare('SELECT * FROM booking_documents WHERE id = ?').get(result.lastInsertRowid));
  });

  fastify.put('/api/bookings/:id/documents/:docId', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT id FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.id);
    if (!booking) return reply.code(404).send({ error: 'Not found' });

    const doc = db.prepare('SELECT * FROM booking_documents WHERE id = ? AND booking_id = ?').get(parseInt(request.params.docId), booking.id);
    if (!doc) return reply.code(404).send({ error: 'Not found' });

    const { no_sertifikat, tgl_bon, keterangan, no_job, nilai_pembayaran, tipe_pembayaran } = request.body ?? {};
    db.prepare(`
      UPDATE booking_documents
      SET no_sertifikat = ?, tgl_bon = ?, keterangan = ?, no_job = ?, nilai_pembayaran = ?, tipe_pembayaran = ?
      WHERE id = ?
    `).run(
      no_sertifikat ?? null, tgl_bon ?? null, keterangan ?? null, no_job ?? null,
      toIntOrNull(nilai_pembayaran), normPayment(tipe_pembayaran), doc.id
    );

    logAudit({ userId: request.session.user.id, action: 'update', entityType: 'booking_document', entityId: doc.id, changes: request.body });
    return db.prepare('SELECT * FROM booking_documents WHERE id = ?').get(doc.id);
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
