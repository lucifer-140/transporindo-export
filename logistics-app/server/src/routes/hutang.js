import { getDb } from '../db.js';
import { logAudit } from '../utils/audit.js';
import { z } from 'zod';
import { requireRole } from '../middleware/requireRole.js';
import { isBukuClosed } from '../utils/bukuGuard.js';

const hutangSchema = z.object({
  pihak: z.string().min(1),
  booking_id: z.number().int().optional().nullable(),
  jumlah: z.number().int().min(0),
  keterangan: z.string().optional().default(''),
  hutang_type: z.enum(['vendor', 'trucking']).optional().default('vendor'),
  container_id: z.number().int().optional().nullable(),
  no_voucher: z.string().optional().nullable(),
});

const pembayaranSchema = z.object({
  jumlah: z.number().int().min(1),
  tanggal: z.string().min(1),
  metode: z.enum(['cash', 'transfer', 'giro', 'lainnya']).default('transfer'),
  keterangan: z.string().optional().default(''),
  no_voucher: z.string().optional().nullable(),
});

const CONTAINER_JOIN = `LEFT JOIN containers c ON h.container_id = c.id`;
const CONTAINER_COLS = `, c.container_no, c.seal_no, c.size, c.no_sp, c.in_date AS cont_in_date, c.out_date AS cont_out_date, c.notes AS cont_notes`;

function buildHutang(db, row, payments) {
  const pmts = payments ?? db.prepare(
    "SELECT * FROM pembayaran WHERE entity_type='hutang' AND entity_id=? ORDER BY tanggal ASC"
  ).all(row.id);
  const total_paid = pmts.reduce((s, p) => s + p.jumlah, 0);
  const sisa = Math.max(0, row.jumlah - total_paid);
  const status = total_paid === 0 ? 'belum_bayar' : sisa === 0 ? 'lunas' : 'sebagian';
  return { ...row, total_paid, sisa, status, pembayaran: pmts };
}

export async function hutangRoutes(fastify) {
  // List all hutang
  fastify.get('/api/hutang', { preHandler: requireRole('finance') }, async (request) => {
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
      SELECT h.*, b.job_no, b.shipper, b.buku_id, b.public_id AS booking_public_id, bk.tahun, bk.bulan
      ${CONTAINER_COLS}
      FROM hutang h
      LEFT JOIN bookings b ON h.booking_id = b.id
      LEFT JOIN buku bk ON b.buku_id = bk.id
      ${CONTAINER_JOIN}
      WHERE ${where}
      ORDER BY h.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    const { total } = db.prepare(`SELECT COUNT(*) AS total FROM hutang h WHERE ${where}`).get(...params);

    let paysByHutang = {};
    if (rows.length > 0) {
      const ids = rows.map(r => r.id);
      const allPays = db.prepare(
        `SELECT * FROM pembayaran WHERE entity_type='hutang' AND entity_id IN (${ids.map(() => '?').join(',')}) ORDER BY tanggal ASC`
      ).all(...ids);
      for (const p of allPays) {
        (paysByHutang[p.entity_id] ??= []).push(p);
      }
    }
    let result = rows.map(row => buildHutang(db, row, paysByHutang[row.id] ?? []));

    if (status) result = result.filter(r => r.status === status);

    return { rows: result, total };
  });

  // Create hutang
  fastify.post('/api/hutang', { preHandler: requireRole('finance') }, async (request, reply) => {
    const parsed = hutangSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { pihak, booking_id, jumlah, keterangan, hutang_type, container_id, no_voucher } = parsed.data;
    const db = getDb();

    if (booking_id) {
      const booking = db.prepare('SELECT id, buku_id FROM bookings WHERE id = ? AND deleted_at IS NULL').get(booking_id);
      if (!booking) return reply.code(404).send({ error: 'Booking not found' });
      if (isBukuClosed(booking.buku_id)) return reply.code(409).send({ error: 'buku_closed' });
    }

    const userId = request.session.user.id;
    const result = db.prepare(
      'INSERT INTO hutang (pihak, booking_id, jumlah, keterangan, hutang_type, container_id, no_voucher, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(pihak, booking_id ?? null, jumlah, keterangan, hutang_type ?? 'vendor', container_id ?? null, no_voucher ?? null, userId);

    logAudit({ userId, action: 'create', entityType: 'hutang', entityId: result.lastInsertRowid, changes: parsed.data });

    const row = db.prepare(`SELECT h.*, b.job_no ${CONTAINER_COLS} FROM hutang h LEFT JOIN bookings b ON h.booking_id = b.id ${CONTAINER_JOIN} WHERE h.id = ?`).get(result.lastInsertRowid);
    return reply.code(201).send(buildHutang(db, row));
  });

  // Update hutang
  fastify.put('/api/hutang/:id', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM hutang WHERE id = ?').get(request.params.id);
    if (!existing) return reply.code(404).send({ error: 'Not found' });
    if (existing.booking_id) {
      const bk = db.prepare('SELECT buku_id FROM bookings WHERE id = ?').get(existing.booking_id);
      if (isBukuClosed(bk?.buku_id)) return reply.code(409).send({ error: 'buku_closed' });
    }

    const parsed = hutangSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { pihak, booking_id, jumlah, keterangan, no_voucher } = parsed.data;
    db.prepare('UPDATE hutang SET pihak=?, booking_id=?, jumlah=?, keterangan=?, no_voucher=? WHERE id=?')
      .run(pihak, booking_id ?? null, jumlah, keterangan, no_voucher ?? existing.no_voucher, existing.id);

    logAudit({ userId: request.session.user.id, action: 'update', entityType: 'hutang', entityId: existing.id, changes: parsed.data });

    const row = db.prepare(`SELECT h.*, b.job_no ${CONTAINER_COLS} FROM hutang h LEFT JOIN bookings b ON h.booking_id = b.id ${CONTAINER_JOIN} WHERE h.id = ?`).get(existing.id);
    return buildHutang(db, row);
  });

  // Delete hutang
  fastify.delete('/api/hutang/:id', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM hutang WHERE id = ?').get(request.params.id);
    if (!existing) return reply.code(404).send({ error: 'Not found' });
    if (existing.booking_id) {
      const bk = db.prepare('SELECT buku_id FROM bookings WHERE id = ?').get(existing.booking_id);
      if (isBukuClosed(bk?.buku_id)) return reply.code(409).send({ error: 'buku_closed' });
    }

    db.prepare("DELETE FROM pembayaran WHERE entity_type='hutang' AND entity_id=?").run(existing.id);
    db.prepare('DELETE FROM hutang WHERE id = ?').run(existing.id);
    logAudit({ userId: request.session.user.id, action: 'delete', entityType: 'hutang', entityId: existing.id });
    return reply.code(204).send();
  });

  // Add pembayaran to hutang
  fastify.post('/api/hutang/:id/pembayaran', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM hutang WHERE id = ?').get(request.params.id);
    if (!existing) return reply.code(404).send({ error: 'Not found' });
    if (existing.booking_id) {
      const bk = db.prepare('SELECT buku_id FROM bookings WHERE id = ?').get(existing.booking_id);
      if (isBukuClosed(bk?.buku_id)) return reply.code(409).send({ error: 'buku_closed' });
    }

    const parsed = pembayaranSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { jumlah, tanggal, metode, keterangan, no_voucher } = parsed.data;

    if (no_voucher != null) {
      db.prepare('UPDATE hutang SET no_voucher = ? WHERE id = ?').run(no_voucher, existing.id);
    }

    const payResult = db.prepare(
      "INSERT INTO pembayaran (entity_type, entity_id, jumlah, tanggal, metode, keterangan, created_by) VALUES ('hutang', ?, ?, ?, ?, ?, ?)"
    ).run(existing.id, jumlah, tanggal, metode, keterangan, request.session.user.id);
    logAudit({ userId: request.session.user.id, action: 'create', entityType: 'hutang_payment', entityId: payResult.lastInsertRowid, changes: { hutang_id: existing.id, jumlah, tanggal, metode } });

    const row = db.prepare(`SELECT h.*, b.job_no ${CONTAINER_COLS} FROM hutang h LEFT JOIN bookings b ON h.booking_id = b.id ${CONTAINER_JOIN} WHERE h.id = ?`).get(existing.id);
    return reply.code(201).send(buildHutang(db, row));
  });

  // Batch pembayaran — each hutang pays its own jumlah
  fastify.post('/api/hutang/pembayaran/batch', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const { payments, tanggal, metode, no_voucher } = request.body ?? {};
    if (!Array.isArray(payments) || payments.length === 0) {
      return reply.code(400).send({ error: 'payments array required' });
    }
    if (!tanggal) return reply.code(400).send({ error: 'tanggal required' });

    const userId = request.session.user.id;
    const insert = db.prepare(
      "INSERT INTO pembayaran (entity_type, entity_id, jumlah, tanggal, metode, keterangan, created_by) VALUES ('hutang', ?, ?, ?, ?, '', ?)"
    );

    db.exec('BEGIN');
    try {
      for (const { hutang_id, jumlah } of payments) {
        const hutang = db.prepare('SELECT id, booking_id FROM hutang WHERE id = ?').get(parseInt(hutang_id));
        if (!hutang) throw new Error(`hutang ${hutang_id} not found`);
        if (hutang.booking_id) {
          const bk = db.prepare('SELECT buku_id FROM bookings WHERE id = ?').get(hutang.booking_id);
          if (isBukuClosed(bk?.buku_id)) throw new Error('buku_closed');
        }
        if (no_voucher != null) {
          db.prepare('UPDATE hutang SET no_voucher = ? WHERE id = ?').run(no_voucher, hutang.id);
        }
        const r = insert.run(hutang.id, parseInt(jumlah), tanggal, metode ?? 'transfer', userId);
        logAudit({ userId, action: 'create', entityType: 'hutang_payment', entityId: r.lastInsertRowid, changes: { hutang_id: hutang.id, jumlah, tanggal, metode } });
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      return reply.code(400).send({ error: err.message });
    }

    return reply.code(201).send({ ok: true, count: payments.length });
  });

  // Edit pembayaran on hutang
  fastify.put('/api/hutang/:id/pembayaran/:payId', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM hutang WHERE id = ?').get(request.params.id);
    if (!existing) return reply.code(404).send({ error: 'Not found' });
    if (existing.booking_id) {
      const bk = db.prepare('SELECT buku_id FROM bookings WHERE id = ?').get(existing.booking_id);
      if (isBukuClosed(bk?.buku_id)) return reply.code(409).send({ error: 'buku_closed' });
    }

    const pay = db.prepare("SELECT * FROM pembayaran WHERE id = ? AND entity_type='hutang' AND entity_id=?").get(request.params.payId, existing.id);
    if (!pay) return reply.code(404).send({ error: 'Payment not found' });

    const parsed = pembayaranSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { jumlah, tanggal, metode, keterangan, no_voucher } = parsed.data;
    if (no_voucher != null) {
      db.prepare('UPDATE hutang SET no_voucher = ? WHERE id = ?').run(no_voucher, existing.id);
    }
    db.prepare('UPDATE pembayaran SET jumlah=?, tanggal=?, metode=?, keterangan=? WHERE id=?')
      .run(jumlah, tanggal, metode, keterangan, pay.id);
    logAudit({ userId: request.session.user.id, action: 'update', entityType: 'hutang_payment', entityId: pay.id, changes: { jumlah, tanggal, metode } });

    const row = db.prepare(`SELECT h.*, b.job_no ${CONTAINER_COLS} FROM hutang h LEFT JOIN bookings b ON h.booking_id = b.id ${CONTAINER_JOIN} WHERE h.id = ?`).get(existing.id);
    return buildHutang(db, row);
  });

  // Remove pembayaran from hutang
  fastify.delete('/api/hutang/:id/pembayaran/:payId', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM hutang WHERE id = ?').get(request.params.id);
    if (!existing) return reply.code(404).send({ error: 'Not found' });
    if (existing.booking_id) {
      const bk = db.prepare('SELECT buku_id FROM bookings WHERE id = ?').get(existing.booking_id);
      if (isBukuClosed(bk?.buku_id)) return reply.code(409).send({ error: 'buku_closed' });
    }

    const pay = db.prepare("SELECT * FROM pembayaran WHERE id = ? AND entity_type='hutang' AND entity_id=?").get(request.params.payId, existing.id);
    if (!pay) return reply.code(404).send({ error: 'Payment not found' });

    db.prepare('DELETE FROM pembayaran WHERE id = ?').run(pay.id);
    logAudit({ userId: request.session.user.id, action: 'delete', entityType: 'hutang_payment', entityId: pay.id, changes: { hutang_id: existing.id } });
    const row = db.prepare(`SELECT h.*, b.job_no ${CONTAINER_COLS} FROM hutang h LEFT JOIN bookings b ON h.booking_id = b.id ${CONTAINER_JOIN} WHERE h.id = ?`).get(existing.id);
    return buildHutang(db, row);
  });

  // Hutang by booking (for BookingDetail inline section)
  fastify.get('/api/bookings/:bookingId/hutang', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT id FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.bookingId);
    if (!booking) return reply.code(404).send({ error: 'Booking not found' });
    const rows = db.prepare(`
      SELECT h.* ${CONTAINER_COLS}
      FROM hutang h
      ${CONTAINER_JOIN}
      WHERE h.booking_id = ?
      ORDER BY h.hutang_type ASC, h.created_at ASC
    `).all(booking.id);
    if (rows.length === 0) return [];
    const ids = rows.map(r => r.id);
    const allPays = db.prepare(
      `SELECT * FROM pembayaran WHERE entity_type='hutang' AND entity_id IN (${ids.map(() => '?').join(',')}) ORDER BY tanggal ASC`
    ).all(...ids);
    const paysByHutang = {};
    for (const p of allPays) {
      (paysByHutang[p.entity_id] ??= []).push(p);
    }
    return rows.map(row => buildHutang(db, row, paysByHutang[row.id] ?? []));
  });
}
