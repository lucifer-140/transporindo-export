import { randomBytes } from 'crypto';
import { getDb } from '../db.js';
import { bookingSchema, statusSchema, pelayaranSchema, containerRowSchema, identitasSchema } from '../schemas/booking.js';
import { logAudit } from '../utils/audit.js';
import { requireRole } from '../middleware/requireRole.js';
import { broadcast } from '../utils/sse.js';
import { isBukuClosed } from '../utils/bukuGuard.js';

function deriveQty(containers) {
  const counts = {};
  for (const c of containers) {
    counts[c.size] = (counts[c.size] ?? 0) + 1;
  }
  return Object.entries(counts).map(([size, n]) => `${n}x${size}`).join(', ') || '';
}

function getContainers(db, bookingId) {
  return db.prepare('SELECT * FROM containers WHERE booking_id = ?').all(bookingId);
}

function syncTruckingHutang(db, container, bookingId, userId) {
  const hasTrucking = container.trucking && container.biaya_trucking > 0;
  const existing = db.prepare('SELECT * FROM hutang WHERE container_id = ? AND hutang_type = ?').get(container.id, 'trucking');
  if (hasTrucking) {
    if (!existing) {
      db.prepare(
        "INSERT INTO hutang (pihak, booking_id, jumlah, keterangan, hutang_type, container_id, created_by) VALUES (?, ?, ?, '', 'trucking', ?, ?)"
      ).run(container.trucking, bookingId, container.biaya_trucking, container.id, userId);
    } else {
      const payCount = db.prepare("SELECT COUNT(*) AS cnt FROM pembayaran WHERE entity_type='hutang' AND entity_id=?").get(existing.id).cnt;
      if (payCount === 0) {
        db.prepare('UPDATE hutang SET pihak=?, jumlah=? WHERE id=?').run(container.trucking, container.biaya_trucking, existing.id);
      }
    }
  } else if (existing) {
    const payCount = db.prepare("SELECT COUNT(*) AS cnt FROM pembayaran WHERE entity_type='hutang' AND entity_id=?").get(existing.id).cnt;
    if (payCount === 0) db.prepare('DELETE FROM hutang WHERE id=?').run(existing.id);
  }
}


export async function bookingRoutes(fastify) {
  // List bookings
  fastify.get('/api/bookings', { preHandler: requireRole('worker') }, async (request) => {
    const db = getDb();
    const { q = '', status = '', from = '', to = '', buku_id = '', page = '1', limit = '20' } = request.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = 'b.deleted_at IS NULL';
    const params = [];

    if (status)  { where += ' AND b.status = ?'; params.push(status); }
    if (buku_id) { where += ' AND b.buku_id = ?'; params.push(parseInt(buku_id)); }
    if (from)    { where += ' AND b.created_at >= ?'; params.push(from); }
    if (to)      { where += ' AND b.created_at <= ?'; params.push(to + 'T23:59:59'); }
    if (q) {
      where += ` AND (b.job_no LIKE ? OR b.shipper LIKE ? OR b.vessel_name LIKE ?
        OR EXISTS (SELECT 1 FROM containers c WHERE c.booking_id = b.id AND c.container_no LIKE ?))`;
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    const rows = db.prepare(`
      SELECT b.*, u.full_name AS created_by_name,
        p.jumlah AS tagihan,
        COALESCE(pm_agg.total_paid, 0) AS piutang_paid,
        COALESCE(p.jumlah, 0) - COALESCE(pm_agg.total_paid, 0) AS sisa_piutang,
        CASE
          WHEN p.jumlah IS NULL THEN 'none'
          WHEN COALESCE(pm_agg.total_paid, 0) = 0 THEN 'belum_bayar'
          WHEN COALESCE(pm_agg.total_paid, 0) >= p.jumlah THEN 'lunas'
          ELSE 'sebagian'
        END AS piutang_status
      FROM bookings b
      LEFT JOIN users u ON b.created_by = u.id
      LEFT JOIN piutang p ON p.booking_id = b.id
      LEFT JOIN (
        SELECT entity_id, SUM(jumlah) AS total_paid
        FROM pembayaran WHERE entity_type = 'piutang'
        GROUP BY entity_id
      ) pm_agg ON pm_agg.entity_id = p.id
      WHERE ${where}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    const { total } = db.prepare(`SELECT COUNT(*) AS total FROM bookings b WHERE ${where}`).get(...params);

    let result;
    if (rows.length === 0) {
      result = [];
    } else {
      const ids = rows.map(r => r.id);
      const allContainers = db.prepare(
        `SELECT * FROM containers WHERE booking_id IN (${ids.map(() => '?').join(',')})`
      ).all(...ids);
      const byBooking = {};
      for (const c of allContainers) {
        (byBooking[c.booking_id] ??= []).push(c);
      }
      result = rows.map(row => {
        const containers = byBooking[row.id] ?? [];
        return { ...row, qty: deriveQty(containers), first_container: containers[0]?.container_no ?? '', extra_containers: Math.max(0, containers.length - 1) };
      });
    }

    return { rows: result, total };
  });

  // CSV export — must be before /:id
  fastify.get('/api/bookings/export', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const { from = '', to = '' } = request.query;
    let where = 'deleted_at IS NULL';
    const params = [];
    if (from) { where += ' AND created_at >= ?'; params.push(from); }
    if (to)   { where += ' AND created_at <= ?'; params.push(to + 'T23:59:59'); }

    const rows = db.prepare(`SELECT * FROM bookings WHERE ${where} ORDER BY created_at DESC`).all(...params);

    const header = 'id,job_no,shipper,port,port_discharge,pelayaran,vessel_name,vessel_no,status,notes,created_at\n';
    const csv = rows.map(r =>
      [r.id, r.job_no, r.shipper, r.port, r.port_discharge, r.pelayaran, r.vessel_name, r.vessel_no, r.status, r.notes, r.created_at]
        .map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n');

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="bookings.csv"');
    return reply.send(header + csv);
  });

  // Get single booking
  fastify.get('/api/bookings/:id', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT * FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.id);
    if (!booking) return reply.code(404).send({ error: 'Not found' });
    const containers = getContainers(db, booking.id);
    return { booking: { ...booking, qty: deriveQty(containers) }, containers };
  });

  // Create booking
  fastify.post('/api/bookings', { preHandler: requireRole('worker') }, async (request, reply) => {
    const parsed = bookingSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { containers, ...fields } = parsed.data;
    const db = getDb();
    const userId = request.session.user.id;

    const buku = db.prepare('SELECT id, status FROM buku WHERE id = ?').get(fields.buku_id);
    if (!buku) return reply.code(400).send({ error: 'Buku not found' });
    if (buku.status === 'closed') return reply.code(409).send({ error: 'buku_closed' });

    const publicId = randomBytes(16).toString('hex');
    const result = db.prepare(`
      INSERT INTO bookings (job_no, shipper, commodity, port, port_discharge, lokasi_muat, pelayaran, vessel_name, vessel_no, in_date, out_date, trucking, notes, status, buku_id, created_by, public_id)
      VALUES (@job_no, @shipper, @commodity, @port, @port_discharge, @lokasi_muat, @pelayaran, @vessel_name, @vessel_no, @in_date, @out_date, @trucking, @notes, 'in_progress', @buku_id, @created_by, @public_id)
    `).run({ ...fields, created_by: userId, public_id: publicId });

    const bookingId = result.lastInsertRowid;

    const insertContainer = db.prepare('INSERT INTO containers (booking_id, container_no, seal_no, size, no_sp, trucking, biaya_trucking, in_date, out_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const c of containers) insertContainer.run(bookingId, c.container_no, c.seal_no, c.size, c.no_sp, c.trucking, c.biaya_trucking ?? null, c.in_date, c.out_date, c.notes);

    logAudit({ userId, action: 'create', entityType: 'booking', entityId: bookingId, changes: parsed.data });
    broadcast(['bookings', 'buku']);

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    const savedContainers = getContainers(db, bookingId);
    return reply.code(201).send({ booking: { ...booking, qty: deriveQty(savedContainers) }, containers: savedContainers });
  });

  // Update booking
  fastify.put('/api/bookings/:id', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.id);
    if (!existing) return reply.code(404).send({ error: 'Not found' });
    if (isBukuClosed(existing.buku_id)) return reply.code(409).send({ error: 'buku_closed' });

    const parsed = bookingSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { containers, ...fields } = parsed.data;
    const userId = request.session.user.id;

    db.prepare(`
      UPDATE bookings SET job_no=@job_no, shipper=@shipper, commodity=@commodity, port=@port,
        port_discharge=@port_discharge, lokasi_muat=@lokasi_muat, pelayaran=@pelayaran, vessel_name=@vessel_name, vessel_no=@vessel_no,
        in_date=@in_date, out_date=@out_date, trucking=@trucking, notes=@notes, buku_id=@buku_id
      WHERE id = @id
    `).run({ ...fields, id: existing.id });

    // Remove trucking hutang with no payments before wiping containers
    const oldTruckingHutang = db.prepare("SELECT * FROM hutang WHERE booking_id = ? AND hutang_type = 'trucking'").all(existing.id);
    for (const h of oldTruckingHutang) {
      const payCount = db.prepare("SELECT COUNT(*) AS cnt FROM pembayaran WHERE entity_type='hutang' AND entity_id=?").get(h.id).cnt;
      if (payCount === 0) db.prepare('DELETE FROM hutang WHERE id=?').run(h.id);
    }

    db.prepare('DELETE FROM containers WHERE booking_id = ?').run(existing.id);
    const insertContainer = db.prepare('INSERT INTO containers (booking_id, container_no, seal_no, size, no_sp, trucking, biaya_trucking, in_date, out_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const c of containers) insertContainer.run(existing.id, c.container_no, c.seal_no, c.size, c.no_sp, c.trucking, c.biaya_trucking ?? null, c.in_date, c.out_date, c.notes);

    logAudit({ userId, action: 'update', entityType: 'booking', entityId: existing.id, changes: parsed.data });
    broadcast(['bookings', 'buku']);

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(existing.id);
    const savedContainers = getContainers(db, existing.id);
    for (const c of savedContainers) { try { syncTruckingHutang(db, c, existing.id, userId); } catch {} }
    return { booking: { ...booking, qty: deriveQty(savedContainers) }, containers: savedContainers };
  });

  // Update status
  fastify.patch('/api/bookings/:id/status', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.id);
    if (!existing) return reply.code(404).send({ error: 'Not found' });
    if (isBukuClosed(existing.buku_id)) return reply.code(409).send({ error: 'buku_closed' });

    const parsed = statusSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(parsed.data.status, existing.id);
    logAudit({ userId: request.session.user.id, action: 'update', entityType: 'booking', entityId: existing.id, changes: { status: parsed.data.status } });
    broadcast(['bookings', 'buku']);

    return db.prepare('SELECT * FROM bookings WHERE id = ?').get(existing.id);
  });

  // Soft delete (admin only)
  fastify.delete('/api/bookings/:id', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.id);
    if (!existing) return reply.code(404).send({ error: 'Not found' });
    if (isBukuClosed(existing.buku_id)) return reply.code(409).send({ error: 'buku_closed' });

    db.prepare('UPDATE bookings SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(existing.id);
    logAudit({ userId: request.session.user.id, action: 'delete', entityType: 'booking', entityId: existing.id });
    broadcast(['bookings', 'buku']);
    return reply.code(204).send();
  });

  // Update identitas section only
  fastify.patch('/api/bookings/:id/identitas', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT * FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.id);
    if (!booking) return reply.code(404).send({ error: 'Not found' });

    const parsed = identitasSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { job_no, shipper, commodity, lokasi_muat, notes } = parsed.data;
    db.prepare('UPDATE bookings SET job_no=?, shipper=?, commodity=?, lokasi_muat=?, notes=? WHERE id=?')
      .run(job_no, shipper, commodity, lokasi_muat, notes, booking.id);

    logAudit({ userId: request.session.user.id, action: 'update', entityType: 'booking', entityId: booking.id, changes: parsed.data });
    broadcast(['bookings']);
    return db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id);
  });

  // Update pelayaran section only
  fastify.patch('/api/bookings/:id/pelayaran', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT * FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.id);
    if (!booking) return reply.code(404).send({ error: 'Not found' });

    const parsed = pelayaranSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { pelayaran, vessel_name, vessel_no, port, port_discharge, lokasi_muat } = parsed.data;
    db.prepare('UPDATE bookings SET pelayaran=?, vessel_name=?, vessel_no=?, port=?, port_discharge=?, lokasi_muat=? WHERE id=?')
      .run(pelayaran, vessel_name, vessel_no, port, port_discharge, lokasi_muat, booking.id);

    logAudit({ userId: request.session.user.id, action: 'update', entityType: 'booking', entityId: booking.id, changes: parsed.data });
    broadcast(['bookings']);
    return db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id);
  });

  // Add single container row (body fields optional)
  fastify.post('/api/bookings/:id/containers', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT * FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.id);
    if (!booking) return reply.code(404).send({ error: 'Not found' });

    const b = request.body ?? {};
    const result = db.prepare(
      'INSERT INTO containers (booking_id, container_no, seal_no, size, no_sp, trucking, biaya_trucking, in_date, out_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(booking.id, b.container_no ?? '', b.seal_no ?? '', b.size ?? '40ft', b.no_sp ?? '', b.trucking ?? '', b.biaya_trucking ?? null, b.in_date ?? '', b.out_date ?? '', b.notes ?? '');

    const container = db.prepare('SELECT * FROM containers WHERE id = ?').get(result.lastInsertRowid);
    try { syncTruckingHutang(db, container, booking.id, request.session.user.id); } catch {}
    broadcast(['bookings']);
    return reply.code(201).send(container);
  });

  // Update single container row (partial patch)
  fastify.patch('/api/containers/:id', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const container = db.prepare('SELECT * FROM containers WHERE id = ?').get(parseInt(request.params.id));
    if (!container) return reply.code(404).send({ error: 'Not found' });

    const parsed = containerRowSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const merged = { ...container, ...parsed.data };
    db.prepare('UPDATE containers SET container_no=?, seal_no=?, size=?, no_sp=?, trucking=?, biaya_trucking=?, in_date=?, out_date=?, notes=? WHERE id=?')
      .run(merged.container_no, merged.seal_no, merged.size, merged.no_sp, merged.trucking, merged.biaya_trucking ?? null, merged.in_date, merged.out_date, merged.notes, container.id);

    const updated = db.prepare('SELECT * FROM containers WHERE id = ?').get(container.id);
    const booking = db.prepare('SELECT id FROM bookings WHERE id = ?').get(container.booking_id);
    if (booking) { try { syncTruckingHutang(db, updated, booking.id, request.session.user.id); } catch {} }
    return updated;
  });

  // Delete single container row
  fastify.delete('/api/containers/:id', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const container = db.prepare('SELECT * FROM containers WHERE id = ?').get(parseInt(request.params.id));
    if (!container) return reply.code(404).send({ error: 'Not found' });

    // Remove linked trucking hutang if no payments exist
    const linkedHutang = db.prepare("SELECT * FROM hutang WHERE container_id = ? AND hutang_type = 'trucking'").get(container.id);
    if (linkedHutang) {
      const payCount = db.prepare("SELECT COUNT(*) AS cnt FROM pembayaran WHERE entity_type='hutang' AND entity_id=?").get(linkedHutang.id).cnt;
      if (payCount === 0) db.prepare('DELETE FROM hutang WHERE id=?').run(linkedHutang.id);
    }

    db.prepare('DELETE FROM containers WHERE id = ?').run(container.id);
    broadcast(['bookings']);
    return reply.code(204).send();
  });

  // Audit log (admin only)
  fastify.get('/api/audit', { preHandler: requireRole('admin') }, async (request) => {
    const db = getDb();
    const { page = '1', limit = '50' } = request.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const rows = db.prepare(`
      SELECT a.*, u.username FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.timestamp DESC LIMIT ? OFFSET ?
    `).all(parseInt(limit), offset);
    const { total } = db.prepare('SELECT COUNT(*) AS total FROM audit_log').get();
    return { rows, total };
  });

  // Audit log CSV export (admin only)
  fastify.get('/api/audit/export', { preHandler: requireRole('admin') }, async (request, reply) => {
    const db = getDb();
    const rows = db.prepare(`
      SELECT a.id, u.username, a.action, a.entity_type, a.entity_id, a.changes, a.timestamp
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.timestamp DESC
    `).all();

    const escape = (v) => {
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const header = 'id,username,action,entity_type,entity_id,changes,timestamp';
    const body = rows.map(r =>
      [r.id, r.username, r.action, r.entity_type, r.entity_id, r.changes, r.timestamp].map(escape).join(',')
    ).join('\n');

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="audit-log.csv"');
    return reply.send(`${header}\n${body}`);
  });
}
