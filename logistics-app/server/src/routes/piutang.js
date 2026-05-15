import { getDb } from '../db.js';
import { logAudit } from '../utils/audit.js';
import { z } from 'zod';
import { requireRole } from '../middleware/requireRole.js';

const piutangSchema = z.object({
  jumlah: z.number().int().min(0),
  keterangan: z.string().optional().default(''),
});

const pembayaranSchema = z.object({
  jumlah: z.number().int().min(1),
  tanggal: z.string().min(1),
  metode: z.enum(['cash', 'transfer', 'giro', 'lainnya']).default('transfer'),
  keterangan: z.string().optional().default(''),
});

function buildPiutang(db, row, payments) {
  const pmts = payments ?? db.prepare(
    "SELECT * FROM pembayaran WHERE entity_type='piutang' AND entity_id=? ORDER BY tanggal ASC"
  ).all(row.id);
  const total_paid = pmts.reduce((s, p) => s + p.jumlah, 0);
  const sisa = Math.max(0, row.jumlah - total_paid);
  const status = total_paid === 0 ? 'belum_bayar' : sisa === 0 ? 'lunas' : 'sebagian';
  return { ...row, total_paid, sisa, status, pembayaran: pmts };
}

export async function piutangRoutes(fastify) {
  // List all piutang (with booking info)
  fastify.get('/api/piutang', { preHandler: requireRole('finance') }, async (request) => {
    const db = getDb();
    const { q = '', page = '1', limit = '20' } = request.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = 'b.deleted_at IS NULL';
    const params = [];

    if (q) {
      where += ' AND (b.job_no LIKE ? OR b.shipper LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like);
    }

    const rows = db.prepare(`
      SELECT p.*, b.job_no, b.shipper, b.buku_id, b.public_id AS booking_public_id FROM piutang p
      JOIN bookings b ON p.booking_id = b.id
      WHERE ${where}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    const { total } = db.prepare(`
      SELECT COUNT(*) AS total FROM piutang p JOIN bookings b ON p.booking_id = b.id WHERE ${where}
    `).get(...params);

    let paysByPiutang = {};
    if (rows.length > 0) {
      const ids = rows.map(r => r.id);
      const allPays = db.prepare(
        `SELECT * FROM pembayaran WHERE entity_type='piutang' AND entity_id IN (${ids.map(() => '?').join(',')}) ORDER BY tanggal ASC`
      ).all(...ids);
      for (const p of allPays) {
        (paysByPiutang[p.entity_id] ??= []).push(p);
      }
    }
    return { rows: rows.map(row => buildPiutang(db, row, paysByPiutang[row.id] ?? [])), total };
  });

  // Get piutang for booking
  fastify.get('/api/bookings/:bookingId/piutang', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT id FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.bookingId);
    if (!booking) return reply.code(404).send({ error: 'Booking not found' });
    const row = db.prepare('SELECT * FROM piutang WHERE booking_id = ?').get(booking.id);
    if (!row) return reply.send(null);
    return buildPiutang(db, row);
  });

  // Create piutang for booking
  fastify.post('/api/bookings/:bookingId/piutang', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT id FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.bookingId);
    if (!booking) return reply.code(404).send({ error: 'Booking not found' });

    const existing = db.prepare('SELECT id FROM piutang WHERE booking_id = ?').get(booking.id);
    if (existing) return reply.code(409).send({ error: 'Piutang already exists for this booking' });

    const parsed = piutangSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { jumlah, keterangan } = parsed.data;
    const userId = request.session.user.id;
    const result = db.prepare(
      'INSERT INTO piutang (booking_id, jumlah, keterangan, created_by) VALUES (?, ?, ?, ?)'
    ).run(booking.id, jumlah, keterangan, userId);

    logAudit({ userId, action: 'create', entityType: 'piutang', entityId: result.lastInsertRowid, changes: parsed.data });

    const row = db.prepare('SELECT * FROM piutang WHERE id = ?').get(result.lastInsertRowid);
    return reply.code(201).send(buildPiutang(db, row));
  });

  // Update piutang
  fastify.put('/api/bookings/:bookingId/piutang/:id', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const row = db.prepare('SELECT * FROM piutang WHERE id = ? AND booking_id = ?').get(request.params.id, request.params.bookingId);
    if (!row) return reply.code(404).send({ error: 'Not found' });

    const parsed = piutangSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { jumlah, keterangan } = parsed.data;
    db.prepare('UPDATE piutang SET jumlah = ?, keterangan = ? WHERE id = ?').run(jumlah, keterangan, row.id);

    logAudit({ userId: request.session.user.id, action: 'update', entityType: 'piutang', entityId: row.id, changes: parsed.data });

    return buildPiutang(db, db.prepare('SELECT * FROM piutang WHERE id = ?').get(row.id));
  });

  // Delete piutang
  fastify.delete('/api/bookings/:bookingId/piutang/:id', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const row = db.prepare('SELECT * FROM piutang WHERE id = ? AND booking_id = ?').get(request.params.id, request.params.bookingId);
    if (!row) return reply.code(404).send({ error: 'Not found' });

    db.prepare("DELETE FROM pembayaran WHERE entity_type='piutang' AND entity_id=?").run(row.id);
    db.prepare('DELETE FROM piutang WHERE id = ?').run(row.id);
    logAudit({ userId: request.session.user.id, action: 'delete', entityType: 'piutang', entityId: row.id });
    return reply.code(204).send();
  });

  // Add pembayaran to piutang
  fastify.post('/api/bookings/:bookingId/piutang/:id/pembayaran', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const row = db.prepare('SELECT * FROM piutang WHERE id = ? AND booking_id = ?').get(request.params.id, request.params.bookingId);
    if (!row) return reply.code(404).send({ error: 'Not found' });

    const parsed = pembayaranSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { jumlah, tanggal, metode, keterangan } = parsed.data;
    db.prepare(
      "INSERT INTO pembayaran (entity_type, entity_id, jumlah, tanggal, metode, keterangan, created_by) VALUES ('piutang', ?, ?, ?, ?, ?, ?)"
    ).run(row.id, jumlah, tanggal, metode, keterangan, request.session.user.id);

    return reply.code(201).send(buildPiutang(db, db.prepare('SELECT * FROM piutang WHERE id = ?').get(row.id)));
  });

  // Edit pembayaran on piutang
  fastify.put('/api/bookings/:bookingId/piutang/:id/pembayaran/:payId', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const row = db.prepare('SELECT * FROM piutang WHERE id = ? AND booking_id = ?').get(request.params.id, request.params.bookingId);
    if (!row) return reply.code(404).send({ error: 'Not found' });

    const pay = db.prepare("SELECT * FROM pembayaran WHERE id = ? AND entity_type='piutang' AND entity_id=?").get(request.params.payId, row.id);
    if (!pay) return reply.code(404).send({ error: 'Payment not found' });

    const parsed = pembayaranSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { jumlah, tanggal, metode, keterangan } = parsed.data;
    db.prepare('UPDATE pembayaran SET jumlah=?, tanggal=?, metode=?, keterangan=? WHERE id=?')
      .run(jumlah, tanggal, metode, keterangan, pay.id);

    return buildPiutang(db, db.prepare('SELECT * FROM piutang WHERE id = ?').get(row.id));
  });

  // Remove pembayaran from piutang
  fastify.delete('/api/bookings/:bookingId/piutang/:id/pembayaran/:payId', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const row = db.prepare('SELECT * FROM piutang WHERE id = ? AND booking_id = ?').get(request.params.id, request.params.bookingId);
    if (!row) return reply.code(404).send({ error: 'Not found' });

    const pay = db.prepare("SELECT * FROM pembayaran WHERE id = ? AND entity_type='piutang' AND entity_id=?").get(request.params.payId, row.id);
    if (!pay) return reply.code(404).send({ error: 'Payment not found' });

    db.prepare('DELETE FROM pembayaran WHERE id = ?').run(pay.id);
    return buildPiutang(db, db.prepare('SELECT * FROM piutang WHERE id = ?').get(row.id));
  });
}
