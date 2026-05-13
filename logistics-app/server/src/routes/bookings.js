import { getDb } from '../db.js';
import { bookingSchema, statusSchema } from '../schemas/booking.js';
import { logAudit } from '../utils/audit.js';
import { requireRole } from '../middleware/requireRole.js';

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
      where += ` AND (b.job_no LIKE ? OR b.shipper LIKE ? OR b.peb LIKE ?
        OR b.bon LIKE ? OR b.vessel_name LIKE ?
        OR EXISTS (SELECT 1 FROM containers c WHERE c.booking_id = b.id AND c.container_no LIKE ?))`;
      const like = `%${q}%`;
      params.push(like, like, like, like, like, like);
    }

    const rows = db.prepare(`
      SELECT b.*, u.full_name AS created_by_name FROM bookings b
      LEFT JOIN users u ON b.created_by = u.id
      WHERE ${where}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    const { total } = db.prepare(`SELECT COUNT(*) AS total FROM bookings b WHERE ${where}`).get(...params);

    const result = rows.map(row => {
      const containers = getContainers(db, row.id);
      return { ...row, qty: deriveQty(containers), first_container: containers[0]?.container_no ?? '', extra_containers: Math.max(0, containers.length - 1) };
    });

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

    const header = 'id,job_no,shipper,peb,port,feeder,vessel_name,vessel_no,bon,status,notes,created_at\n';
    const csv = rows.map(r =>
      [r.id, r.job_no, r.shipper, r.peb, r.port, r.feeder, r.vessel_name, r.vessel_no, r.bon, r.status, r.notes, r.created_at]
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
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND deleted_at IS NULL').get(request.params.id);
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

    const result = db.prepare(`
      INSERT INTO bookings (job_no, shipper, commodity, peb, port, feeder, vessel_name, vessel_no, bon, in_date, out_date, trucking, notes, status, buku_id, created_by)
      VALUES (@job_no, @shipper, @commodity, @peb, @port, @feeder, @vessel_name, @vessel_no, @bon, @in_date, @out_date, @trucking, @notes, 'in_progress', @buku_id, @created_by)
    `).run({ ...fields, created_by: userId });

    const bookingId = result.lastInsertRowid;

    const insertContainer = db.prepare('INSERT INTO containers (booking_id, container_no, seal_no, size) VALUES (?, ?, ?, ?)');
    for (const c of containers) insertContainer.run(bookingId, c.container_no, c.seal_no, c.size);

    logAudit({ userId, action: 'create', entityType: 'booking', entityId: bookingId, changes: parsed.data });

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    const savedContainers = getContainers(db, bookingId);
    return reply.code(201).send({ booking: { ...booking, qty: deriveQty(savedContainers) }, containers: savedContainers });
  });

  // Update booking
  fastify.put('/api/bookings/:id', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM bookings WHERE id = ? AND deleted_at IS NULL').get(request.params.id);
    if (!existing) return reply.code(404).send({ error: 'Not found' });

    const parsed = bookingSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { containers, ...fields } = parsed.data;
    const userId = request.session.user.id;

    db.prepare(`
      UPDATE bookings SET job_no=@job_no, shipper=@shipper, commodity=@commodity, peb=@peb, port=@port,
        feeder=@feeder, vessel_name=@vessel_name, vessel_no=@vessel_no, bon=@bon,
        in_date=@in_date, out_date=@out_date, trucking=@trucking, notes=@notes
      WHERE id = @id
    `).run({ ...fields, id: existing.id });

    db.prepare('DELETE FROM containers WHERE booking_id = ?').run(existing.id);
    const insertContainer = db.prepare('INSERT INTO containers (booking_id, container_no, seal_no, size) VALUES (?, ?, ?, ?)');
    for (const c of containers) insertContainer.run(existing.id, c.container_no, c.seal_no, c.size);

    logAudit({ userId, action: 'update', entityType: 'booking', entityId: existing.id, changes: parsed.data });

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(existing.id);
    const savedContainers = getContainers(db, existing.id);
    return { booking: { ...booking, qty: deriveQty(savedContainers) }, containers: savedContainers };
  });

  // Update status
  fastify.patch('/api/bookings/:id/status', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM bookings WHERE id = ? AND deleted_at IS NULL').get(request.params.id);
    if (!existing) return reply.code(404).send({ error: 'Not found' });

    const parsed = statusSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(parsed.data.status, existing.id);
    logAudit({ userId: request.session.user.id, action: 'update', entityType: 'booking', entityId: existing.id, changes: { status: parsed.data.status } });

    return db.prepare('SELECT * FROM bookings WHERE id = ?').get(existing.id);
  });

  // Soft delete (admin only)
  fastify.delete('/api/bookings/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM bookings WHERE id = ? AND deleted_at IS NULL').get(request.params.id);
    if (!existing) return reply.code(404).send({ error: 'Not found' });

    db.prepare('UPDATE bookings SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(existing.id);
    logAudit({ userId: request.session.user.id, action: 'delete', entityType: 'booking', entityId: existing.id });
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
}
