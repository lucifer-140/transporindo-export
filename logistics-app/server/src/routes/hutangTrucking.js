import { getDb } from '../db.js';
import { requireRole } from '../middleware/requireRole.js';
import { logAudit } from '../utils/audit.js';

export async function hutangTruckingRoutes(fastify) {
  // Search booking by job_no, return booking + container/hutang rows with payments
  fastify.get('/api/hutang-trucking', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const job = (request.query.job ?? '').trim();
    if (!job) return reply.code(400).send({ error: 'job query param required' });

    const booking = db.prepare(`
      SELECT id, public_id, job_no, port, shipper
      FROM bookings
      WHERE job_no = ? AND deleted_at IS NULL
    `).get(job);
    if (!booking) return reply.code(404).send({ error: 'Booking tidak ditemukan' });

    const rows = db.prepare(`
      SELECT h.id AS hutang_id, h.jumlah AS biaya_trucking,
             c.container_no, c.size, c.trucking, c.no_sp, c.in_date, c.out_date,
             c.id AS container_id
      FROM hutang h
      JOIN containers c ON c.id = h.container_id
      WHERE h.booking_id = ? AND h.hutang_type = 'trucking'
      ORDER BY c.id ASC
    `).all(booking.id);

    const hutangIds = rows.map(r => r.hutang_id);
    const payments = hutangIds.length
      ? db.prepare(`
          SELECT p.*, u.username AS created_by_name
          FROM hutang_trucking_payments p
          LEFT JOIN users u ON u.id = p.created_by
          WHERE p.hutang_id IN (${hutangIds.map(() => '?').join(',')})
          ORDER BY p.created_at ASC
        `).all(...hutangIds)
      : [];

    const paymentsByHutang = {};
    for (const p of payments) {
      if (!paymentsByHutang[p.hutang_id]) paymentsByHutang[p.hutang_id] = [];
      paymentsByHutang[p.hutang_id].push(p);
    }

    return {
      booking,
      rows: rows.map(r => {
        const pmts = paymentsByHutang[r.hutang_id] ?? [];
        const total_paid = pmts.reduce((s, p) => s + (p.nilai_pembayaran ?? 0), 0);
        const sisa = Math.max(0, (r.biaya_trucking ?? 0) - total_paid);
        const status = total_paid === 0 ? 'belum_bayar' : sisa === 0 ? 'lunas' : 'sebagian';
        return { ...r, payments: pmts, total_paid, sisa, status };
      }),
    };
  });

  // Create payment(s) — accepts payments[] array, each with hutang_id + nilai_pembayaran
  fastify.post('/api/hutang-trucking/payments', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const { payments, no_voucher, tgl_pembayaran, metode } = request.body ?? {};
    if (!Array.isArray(payments) || payments.length === 0) {
      return reply.code(400).send({ error: 'payments array required' });
    }

    const userId = request.session.user.id;
    const insert = db.prepare(`
      INSERT INTO hutang_trucking_payments (hutang_id, no_voucher, nilai_pembayaran, tgl_pembayaran, metode, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN');
    let created;
    try {
      created = payments.map(({ hutang_id, nilai_pembayaran }) => {
        const hutang = db.prepare('SELECT id FROM hutang WHERE id = ? AND hutang_type = ?').get(parseInt(hutang_id), 'trucking');
        if (!hutang) throw new Error(`hutang ${hutang_id} not found`);
        const result = insert.run(
          hutang.id,
          no_voucher ?? null,
          nilai_pembayaran ? parseInt(nilai_pembayaran) : null,
          tgl_pembayaran ?? null,
          metode ?? 'transfer',
          userId
        );
        logAudit({ userId, action: 'create', entityType: 'hutang_trucking_payments', entityId: result.lastInsertRowid, changes: { hutang_id: hutang.id, nilai_pembayaran, no_voucher, tgl_pembayaran, metode } });
        return db.prepare('SELECT * FROM hutang_trucking_payments WHERE id = ?').get(result.lastInsertRowid);
      });
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      return reply.code(400).send({ error: err.message });
    }

    return reply.code(201).send(created);
  });

  // Update single payment
  fastify.put('/api/hutang-trucking/payments/:id', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const row = db.prepare('SELECT * FROM hutang_trucking_payments WHERE id = ?').get(parseInt(request.params.id));
    if (!row) return reply.code(404).send({ error: 'Not found' });

    const { keterangan, no_voucher, tgl_pelunasan, nilai_pembayaran, tgl_pembayaran, metode } = request.body ?? {};
    db.prepare(`
      UPDATE hutang_trucking_payments
      SET keterangan = ?, no_voucher = ?, tgl_pelunasan = ?, nilai_pembayaran = ?, tgl_pembayaran = ?, metode = ?
      WHERE id = ?
    `).run(
      keterangan ?? null, no_voucher ?? null, tgl_pelunasan ?? null,
      nilai_pembayaran ? parseInt(nilai_pembayaran) : null,
      tgl_pembayaran ?? null, metode ?? 'transfer', row.id
    );

    logAudit({ userId: request.session.user.id, action: 'update', entityType: 'hutang_trucking_payments', entityId: row.id, changes: request.body });
    return db.prepare('SELECT * FROM hutang_trucking_payments WHERE id = ?').get(row.id);
  });

  // Delete single payment
  fastify.delete('/api/hutang-trucking/payments/:id', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const row = db.prepare('SELECT * FROM hutang_trucking_payments WHERE id = ?').get(parseInt(request.params.id));
    if (!row) return reply.code(404).send({ error: 'Not found' });

    db.prepare('DELETE FROM hutang_trucking_payments WHERE id = ?').run(row.id);
    logAudit({ userId: request.session.user.id, action: 'delete', entityType: 'hutang_trucking_payments', entityId: row.id });
    return reply.code(204).send();
  });
}
