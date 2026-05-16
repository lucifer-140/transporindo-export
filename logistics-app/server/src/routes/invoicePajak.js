import { getDb } from '../db.js';
import { logAudit } from '../utils/audit.js';
import { z } from 'zod';
import { requireRole } from '../middleware/requireRole.js';
import { isBukuClosed } from '../utils/bukuGuard.js';

const headerSchema = z.object({
  ppn_rate:   z.number().int().min(0).max(100).optional(),
  keterangan: z.string().optional().default(''),
});

const itemSchema = z.object({
  keterangan: z.string().min(1),
  harga:      z.number().int().min(0),
  urutan:     z.number().int().min(0).optional().default(0),
});

function buildInvoice(db, row) {
  const items = db.prepare(
    'SELECT * FROM invoice_pajak_items WHERE invoice_pajak_id = ? ORDER BY urutan ASC, id ASC'
  ).all(row.id);

  const total_nilai_penyerahan = items.reduce((s, i) => s + i.harga, 0);
  const dasar_pengenaan_pajak  = total_nilai_penyerahan;
  const ppn     = Math.round(dasar_pengenaan_pajak * row.ppn_rate / 100);
  const total_bayar = total_nilai_penyerahan + ppn;

  return { ...row, items, total_nilai_penyerahan, dasar_pengenaan_pajak, ppn, total_bayar };
}

export async function invoicePajakRoutes(fastify) {
  // GET invoice pajak for booking
  fastify.get('/api/bookings/:bookingId/invoice-pajak', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT id FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.bookingId);
    if (!booking) return reply.code(404).send({ error: 'Booking not found' });

    const row = db.prepare('SELECT * FROM invoice_pajak WHERE booking_id = ?').get(booking.id);
    if (!row) return reply.send(null);
    return buildInvoice(db, row);
  });

  // CREATE invoice pajak
  fastify.post('/api/bookings/:bookingId/invoice-pajak', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const booking = db.prepare('SELECT id, buku_id FROM bookings WHERE public_id = ? AND deleted_at IS NULL').get(request.params.bookingId);
    if (!booking) return reply.code(404).send({ error: 'Booking not found' });
    if (isBukuClosed(booking.buku_id)) return reply.code(409).send({ error: 'buku_closed' });

    const existing = db.prepare('SELECT id FROM invoice_pajak WHERE booking_id = ?').get(booking.id);
    if (existing) return reply.code(409).send({ error: 'Invoice pajak already exists for this booking' });

    const parsed = headerSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const setting = db.prepare("SELECT value FROM app_settings WHERE key = 'ppn_rate'").get();
    const ppn_rate = parsed.data.ppn_rate ?? parseInt(setting?.value ?? '11');

    const result = db.prepare(
      'INSERT INTO invoice_pajak (booking_id, ppn_rate, keterangan, created_by) VALUES (?, ?, ?, ?)'
    ).run(booking.id, ppn_rate, parsed.data.keterangan, request.session.user.id);

    logAudit({ userId: request.session.user.id, action: 'create', entityType: 'invoice_pajak', entityId: result.lastInsertRowid, changes: { ppn_rate, keterangan: parsed.data.keterangan } });

    const row = db.prepare('SELECT * FROM invoice_pajak WHERE id = ?').get(result.lastInsertRowid);
    return reply.code(201).send(buildInvoice(db, row));
  });

  // UPDATE invoice pajak header
  fastify.put('/api/bookings/:bookingId/invoice-pajak/:id', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const row = db.prepare('SELECT ip.*, b.buku_id FROM invoice_pajak ip JOIN bookings b ON b.id = ip.booking_id WHERE ip.id = ?').get(request.params.id);
    if (!row) return reply.code(404).send({ error: 'Not found' });
    if (isBukuClosed(row.buku_id)) return reply.code(409).send({ error: 'buku_closed' });

    const parsed = headerSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const ppn_rate = parsed.data.ppn_rate ?? row.ppn_rate;
    db.prepare('UPDATE invoice_pajak SET ppn_rate = ?, keterangan = ? WHERE id = ?').run(ppn_rate, parsed.data.keterangan, row.id);

    logAudit({ userId: request.session.user.id, action: 'update', entityType: 'invoice_pajak', entityId: row.id, changes: parsed.data });
    return buildInvoice(db, db.prepare('SELECT * FROM invoice_pajak WHERE id = ?').get(row.id));
  });

  // DELETE invoice pajak (cascades items)
  fastify.delete('/api/bookings/:bookingId/invoice-pajak/:id', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const row = db.prepare('SELECT ip.*, b.buku_id FROM invoice_pajak ip JOIN bookings b ON b.id = ip.booking_id WHERE ip.id = ?').get(request.params.id);
    if (!row) return reply.code(404).send({ error: 'Not found' });
    if (isBukuClosed(row.buku_id)) return reply.code(409).send({ error: 'buku_closed' });

    db.prepare('DELETE FROM invoice_pajak WHERE id = ?').run(row.id);
    logAudit({ userId: request.session.user.id, action: 'delete', entityType: 'invoice_pajak', entityId: row.id });
    return reply.code(204).send();
  });

  // ADD line item
  fastify.post('/api/bookings/:bookingId/invoice-pajak/:id/items', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const row = db.prepare('SELECT ip.*, b.buku_id FROM invoice_pajak ip JOIN bookings b ON b.id = ip.booking_id WHERE ip.id = ?').get(request.params.id);
    if (!row) return reply.code(404).send({ error: 'Not found' });
    if (isBukuClosed(row.buku_id)) return reply.code(409).send({ error: 'buku_closed' });

    const parsed = itemSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    db.prepare('INSERT INTO invoice_pajak_items (invoice_pajak_id, keterangan, harga, urutan) VALUES (?, ?, ?, ?)').run(row.id, parsed.data.keterangan, parsed.data.harga, parsed.data.urutan);

    return reply.code(201).send(buildInvoice(db, db.prepare('SELECT * FROM invoice_pajak WHERE id = ?').get(row.id)));
  });

  // UPDATE line item
  fastify.put('/api/bookings/:bookingId/invoice-pajak/:id/items/:itemId', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const row = db.prepare('SELECT ip.*, b.buku_id FROM invoice_pajak ip JOIN bookings b ON b.id = ip.booking_id WHERE ip.id = ?').get(request.params.id);
    if (!row) return reply.code(404).send({ error: 'Not found' });
    if (isBukuClosed(row.buku_id)) return reply.code(409).send({ error: 'buku_closed' });

    const item = db.prepare('SELECT * FROM invoice_pajak_items WHERE id = ? AND invoice_pajak_id = ?').get(request.params.itemId, row.id);
    if (!item) return reply.code(404).send({ error: 'Item not found' });

    const parsed = itemSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    db.prepare('UPDATE invoice_pajak_items SET keterangan = ?, harga = ?, urutan = ? WHERE id = ?').run(parsed.data.keterangan, parsed.data.harga, parsed.data.urutan, item.id);

    return buildInvoice(db, db.prepare('SELECT * FROM invoice_pajak WHERE id = ?').get(row.id));
  });

  // DELETE line item
  fastify.delete('/api/bookings/:bookingId/invoice-pajak/:id/items/:itemId', { preHandler: requireRole('finance') }, async (request, reply) => {
    const db = getDb();
    const row = db.prepare('SELECT ip.*, b.buku_id FROM invoice_pajak ip JOIN bookings b ON b.id = ip.booking_id WHERE ip.id = ?').get(request.params.id);
    if (!row) return reply.code(404).send({ error: 'Not found' });
    if (isBukuClosed(row.buku_id)) return reply.code(409).send({ error: 'buku_closed' });

    const item = db.prepare('SELECT * FROM invoice_pajak_items WHERE id = ? AND invoice_pajak_id = ?').get(request.params.itemId, row.id);
    if (!item) return reply.code(404).send({ error: 'Item not found' });

    db.prepare('DELETE FROM invoice_pajak_items WHERE id = ?').run(item.id);
    return buildInvoice(db, db.prepare('SELECT * FROM invoice_pajak WHERE id = ?').get(row.id));
  });
}
