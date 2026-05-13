import { getDb } from '../db.js';
import { logAudit } from '../utils/audit.js';
import { z } from 'zod';

const STUB_USER_ID = 1;

const hutangSchema = z.object({
  pihak: z.string().min(1),
  booking_id: z.number().int().optional().nullable(),
  jumlah: z.number().int().min(0),
  keterangan: z.string().optional().default(''),
});

const pembayaranSchema = z.object({
  jumlah: z.number().int().min(1),
  tanggal: z.string().min(1),
  keterangan: z.string().optional().default(''),
});

function buildHutang(db, row) {
  const payments = db.prepare(
    "SELECT * FROM pembayaran WHERE entity_type='hutang' AND entity_id=? ORDER BY tanggal ASC"
  ).all(row.id);
  const total_paid = payments.reduce((s, p) => s + p.jumlah, 0);
  const sisa = Math.max(0, row.jumlah - total_paid);
  const status = total_paid === 0 ? 'belum_bayar' : sisa === 0 ? 'lunas' : 'sebagian';
  return { ...row, total_paid, sisa, status, pembayaran: payments };
}

export async function hutangRoutes(fastify) {
  // List all hutang
  fastify.get('/api/hutang', async (request) => {
    const db = getDb();
    const { q = '', status = '', page = '1', limit = '20' } = request.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = '1=1';
    const params = [];

    if (q) {
      where += ' AND (h.pihak LIKE ? OR h.keterangan LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like);
    }

    const rows = db.prepare(`
      SELECT h.*, b.job_no FROM hutang h
      LEFT JOIN bookings b ON h.booking_id = b.id
      WHERE ${where}
      ORDER BY h.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    const { total } = db.prepare(`SELECT COUNT(*) AS total FROM hutang h WHERE ${where}`).get(...params);

    let result = rows.map(row => buildHutang(db, row));

    if (status) result = result.filter(r => r.status === status);

    return { rows: result, total };
  });

  // Create hutang
  fastify.post('/api/hutang', async (request, reply) => {
    const parsed = hutangSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { pihak, booking_id, jumlah, keterangan } = parsed.data;
    const db = getDb();

    if (booking_id) {
      const booking = db.prepare('SELECT id FROM bookings WHERE id = ? AND deleted_at IS NULL').get(booking_id);
      if (!booking) return reply.code(404).send({ error: 'Booking not found' });
    }

    const result = db.prepare(
      'INSERT INTO hutang (pihak, booking_id, jumlah, keterangan, created_by) VALUES (?, ?, ?, ?, ?)'
    ).run(pihak, booking_id ?? null, jumlah, keterangan, STUB_USER_ID);

    logAudit({ userId: STUB_USER_ID, action: 'create', entityType: 'hutang', entityId: result.lastInsertRowid, changes: parsed.data });

    const row = db.prepare('SELECT h.*, b.job_no FROM hutang h LEFT JOIN bookings b ON h.booking_id = b.id WHERE h.id = ?').get(result.lastInsertRowid);
    return reply.code(201).send(buildHutang(db, row));
  });

  // Update hutang
  fastify.put('/api/hutang/:id', async (request, reply) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM hutang WHERE id = ?').get(request.params.id);
    if (!existing) return reply.code(404).send({ error: 'Not found' });

    const parsed = hutangSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { pihak, booking_id, jumlah, keterangan } = parsed.data;
    db.prepare('UPDATE hutang SET pihak=?, booking_id=?, jumlah=?, keterangan=? WHERE id=?')
      .run(pihak, booking_id ?? null, jumlah, keterangan, existing.id);

    logAudit({ userId: STUB_USER_ID, action: 'update', entityType: 'hutang', entityId: existing.id, changes: parsed.data });

    const row = db.prepare('SELECT h.*, b.job_no FROM hutang h LEFT JOIN bookings b ON h.booking_id = b.id WHERE h.id = ?').get(existing.id);
    return buildHutang(db, row);
  });

  // Delete hutang
  fastify.delete('/api/hutang/:id', async (request, reply) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM hutang WHERE id = ?').get(request.params.id);
    if (!existing) return reply.code(404).send({ error: 'Not found' });

    db.prepare("DELETE FROM pembayaran WHERE entity_type='hutang' AND entity_id=?").run(existing.id);
    db.prepare('DELETE FROM hutang WHERE id = ?').run(existing.id);
    logAudit({ userId: STUB_USER_ID, action: 'delete', entityType: 'hutang', entityId: existing.id });
    return reply.code(204).send();
  });

  // Add pembayaran to hutang
  fastify.post('/api/hutang/:id/pembayaran', async (request, reply) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM hutang WHERE id = ?').get(request.params.id);
    if (!existing) return reply.code(404).send({ error: 'Not found' });

    const parsed = pembayaranSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { jumlah, tanggal, keterangan } = parsed.data;
    db.prepare(
      "INSERT INTO pembayaran (entity_type, entity_id, jumlah, tanggal, keterangan, created_by) VALUES ('hutang', ?, ?, ?, ?, ?)"
    ).run(existing.id, jumlah, tanggal, keterangan, STUB_USER_ID);

    const row = db.prepare('SELECT h.*, b.job_no FROM hutang h LEFT JOIN bookings b ON h.booking_id = b.id WHERE h.id = ?').get(existing.id);
    return reply.code(201).send(buildHutang(db, row));
  });

  // Remove pembayaran from hutang
  fastify.delete('/api/hutang/:id/pembayaran/:payId', async (request, reply) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM hutang WHERE id = ?').get(request.params.id);
    if (!existing) return reply.code(404).send({ error: 'Not found' });

    const pay = db.prepare("SELECT * FROM pembayaran WHERE id = ? AND entity_type='hutang' AND entity_id=?").get(request.params.payId, existing.id);
    if (!pay) return reply.code(404).send({ error: 'Payment not found' });

    db.prepare('DELETE FROM pembayaran WHERE id = ?').run(pay.id);
    const row = db.prepare('SELECT h.*, b.job_no FROM hutang h LEFT JOIN bookings b ON h.booking_id = b.id WHERE h.id = ?').get(existing.id);
    return buildHutang(db, row);
  });

  // Hutang by booking (for BookingDetail inline section)
  fastify.get('/api/bookings/:bookingId/hutang', async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT id FROM bookings WHERE id = ? AND deleted_at IS NULL').get(request.params.bookingId);
    if (!booking) return reply.code(404).send({ error: 'Booking not found' });
    const rows = db.prepare('SELECT * FROM hutang WHERE booking_id = ? ORDER BY created_at ASC').all(booking.id);
    return rows.map(row => buildHutang(db, row));
  });
}
