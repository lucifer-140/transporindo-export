import { getDb } from '../db.js';
import { requireRole } from '../middleware/requireRole.js';
import { logAudit } from '../utils/audit.js';

export async function hutangDokumenRoutes(fastify) {
  // Search booking by no_job, return booking + documents + existing hutang_dokumen entries
  fastify.get('/api/hutang-dokumen', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const job = (request.query.job ?? '').trim();
    if (!job) return reply.code(400).send({ error: 'job query param required' });

    const booking = db.prepare(`
      SELECT id, public_id, job_no, port, shipper
      FROM bookings
      WHERE job_no = ? AND deleted_at IS NULL
    `).get(job);
    if (!booking) return reply.code(404).send({ error: 'Booking tidak ditemukan' });

    const docs = db.prepare('SELECT * FROM booking_documents WHERE booking_id = ? ORDER BY created_at ASC').all(booking.id);
    const docIds = docs.map(d => d.id);
    const hutang = docIds.length
      ? db.prepare(`SELECT * FROM hutang_dokumen WHERE booking_document_id IN (${docIds.map(() => '?').join(',')}) ORDER BY created_at ASC`).all(...docIds)
      : [];

    return { booking, docs, hutang };
  });

  // Create payment entry
  fastify.post('/api/hutang-dokumen', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const { booking_document_id, keterangan, no_voucher, tgl_pelunasan, nilai_pembayaran, tgl_pembayaran } = request.body ?? {};
    if (!booking_document_id) return reply.code(400).send({ error: 'booking_document_id required' });

    const doc = db.prepare('SELECT * FROM booking_documents WHERE id = ?').get(parseInt(booking_document_id));
    if (!doc) return reply.code(404).send({ error: 'Dokumen tidak ditemukan' });

    const userId = request.session.user.id;
    const result = db.prepare(`
      INSERT INTO hutang_dokumen (booking_document_id, booking_id, keterangan, no_voucher, tgl_pelunasan, nilai_pembayaran, tgl_pembayaran, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      doc.id, doc.booking_id,
      keterangan ?? null, no_voucher ?? null, tgl_pelunasan ?? null,
      nilai_pembayaran ? parseInt(nilai_pembayaran) : null,
      tgl_pembayaran ?? null, userId
    );

    logAudit({ userId, action: 'create', entityType: 'hutang_dokumen', entityId: result.lastInsertRowid, changes: request.body });
    return reply.code(201).send(db.prepare('SELECT * FROM hutang_dokumen WHERE id = ?').get(result.lastInsertRowid));
  });

  // Update payment entry
  fastify.put('/api/hutang-dokumen/:id', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const row = db.prepare('SELECT * FROM hutang_dokumen WHERE id = ?').get(parseInt(request.params.id));
    if (!row) return reply.code(404).send({ error: 'Not found' });

    const { keterangan, no_voucher, tgl_pelunasan, nilai_pembayaran, tgl_pembayaran } = request.body ?? {};
    db.prepare(`
      UPDATE hutang_dokumen SET keterangan = ?, no_voucher = ?, tgl_pelunasan = ?, nilai_pembayaran = ?, tgl_pembayaran = ? WHERE id = ?
    `).run(
      keterangan ?? null, no_voucher ?? null, tgl_pelunasan ?? null,
      nilai_pembayaran ? parseInt(nilai_pembayaran) : null,
      tgl_pembayaran ?? null, row.id
    );

    logAudit({ userId: request.session.user.id, action: 'update', entityType: 'hutang_dokumen', entityId: row.id, changes: request.body });
    return db.prepare('SELECT * FROM hutang_dokumen WHERE id = ?').get(row.id);
  });

  // Delete payment entry
  fastify.delete('/api/hutang-dokumen/:id', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const row = db.prepare('SELECT * FROM hutang_dokumen WHERE id = ?').get(parseInt(request.params.id));
    if (!row) return reply.code(404).send({ error: 'Not found' });

    db.prepare('DELETE FROM hutang_dokumen WHERE id = ?').run(row.id);
    logAudit({ userId: request.session.user.id, action: 'delete', entityType: 'hutang_dokumen', entityId: row.id });
    return reply.code(204).send();
  });
}
