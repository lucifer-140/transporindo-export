import { getDb } from '../db.js';
import { requireRole } from '../middleware/requireRole.js';

export async function bukuRoutes(fastify) {
  // List all buku with booking count + financial aggregates
  fastify.get('/api/buku', { preHandler: requireRole('worker') }, async () => {
    const db = getDb();
    const rows = db.prepare(`
      SELECT b.*,
        COUNT(DISTINCT bk.id) AS booking_count,
        COALESCE(SUM(p.jumlah), 0) AS tagihan,
        COALESCE(SUM(pm_agg.total_paid), 0) AS dibayar
      FROM buku b
      LEFT JOIN bookings bk ON bk.buku_id = b.id AND bk.deleted_at IS NULL
      LEFT JOIN piutang p ON p.booking_id = bk.id
      LEFT JOIN (
        SELECT entity_id, SUM(jumlah) AS total_paid
        FROM pembayaran WHERE entity_type = 'piutang'
        GROUP BY entity_id
      ) pm_agg ON pm_agg.entity_id = p.id
      GROUP BY b.id
      ORDER BY b.tahun DESC, b.bulan DESC
    `).all();
    return rows.map(r => ({ ...r, sisa: r.tagihan - r.dibayar }));
  });

  // Create buku
  fastify.post('/api/buku', { preHandler: requireRole('worker') }, async (request, reply) => {
    const { tahun, bulan } = request.body ?? {};
    if (!tahun || !bulan) return reply.code(400).send({ error: 'tahun and bulan required' });
    if (bulan < 1 || bulan > 12) return reply.code(400).send({ error: 'bulan must be 1-12' });

    const db = getDb();
    const userId = request.session.user?.id ?? null;
    try {
      const result = db.prepare(
        'INSERT INTO buku (tahun, bulan, created_by) VALUES (?, ?, ?)'
      ).run(tahun, bulan, userId);
      return reply.code(201).send(db.prepare('SELECT * FROM buku WHERE id = ?').get(result.lastInsertRowid));
    } catch (e) {
      if (e.message?.includes('UNIQUE')) return reply.code(409).send({ error: 'Buku for this month already exists' });
      throw e;
    }
  });

  // Get single buku with shipper breakdown
  fastify.get('/api/buku/:id', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const buku = db.prepare('SELECT * FROM buku WHERE id = ?').get(request.params.id);
    if (!buku) return reply.code(404).send({ error: 'Not found' });

    const bookings = db.prepare(`
      SELECT bk.id, bk.job_no, bk.shipper, bk.commodity, bk.vessel_name, bk.vessel_no,
             bk.in_date, bk.out_date, bk.peb, bk.bon, bk.trucking, bk.status, bk.created_at,
             p.jumlah AS tagihan, p.id AS piutang_id,
             COALESCE((
               SELECT SUM(pm.jumlah) FROM pembayaran pm
               WHERE pm.entity_type = 'piutang' AND pm.entity_id = p.id
             ), 0) AS total_paid
      FROM bookings bk
      LEFT JOIN piutang p ON p.booking_id = bk.id
      WHERE bk.buku_id = ? AND bk.deleted_at IS NULL
      ORDER BY bk.shipper, bk.created_at
    `).all(buku.id);

    // Group by shipper
    const shipperMap = {};
    for (const row of bookings) {
      if (!shipperMap[row.shipper]) {
        shipperMap[row.shipper] = { shipper: row.shipper, bookings: [], total_tagihan: 0, total_paid: 0 };
      }
      const sisa = (row.tagihan ?? 0) - (row.total_paid ?? 0);
      shipperMap[row.shipper].bookings.push({
        id: row.id,
        job_no: row.job_no,
        commodity: row.commodity ?? null,
        vessel_name: row.vessel_name ?? null,
        vessel_no: row.vessel_no ?? null,
        in_date: row.in_date ?? null,
        out_date: row.out_date ?? null,
        peb: row.peb ?? null,
        trucking: row.trucking ?? null,
        status: row.status,
        created_at: row.created_at,
        tagihan: row.tagihan ?? 0,
        total_paid: row.total_paid ?? 0,
        sisa,
        piutang_status: !row.tagihan ? 'none' : sisa <= 0 ? 'lunas' : row.total_paid > 0 ? 'sebagian' : 'belum_bayar',
      });
      shipperMap[row.shipper].total_tagihan += row.tagihan ?? 0;
      shipperMap[row.shipper].total_paid += row.total_paid ?? 0;
    }

    const shippers = Object.values(shipperMap).map(s => ({
      ...s,
      sisa: s.total_tagihan - s.total_paid,
      status: s.total_tagihan === 0 ? 'none'
        : s.total_tagihan - s.total_paid <= 0 ? 'lunas'
        : s.total_paid > 0 ? 'sebagian' : 'belum_bayar',
    }));

    return { buku, shippers, booking_count: bookings.length };
  });

  // Get flat bookings list for a buku (operational view)
  fastify.get('/api/buku/:id/bookings', { preHandler: requireRole('worker') }, async (request, reply) => {
    const db = getDb();
    const buku = db.prepare('SELECT * FROM buku WHERE id = ?').get(request.params.id);
    if (!buku) return reply.code(404).send({ error: 'Not found' });

    const bookings = db.prepare(`
      SELECT id, job_no, shipper, peb, port, feeder, vessel_name, vessel_no, bon, status, notes, created_at
      FROM bookings
      WHERE buku_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
    `).all(buku.id);

    return { buku, bookings };
  });

  // Delete buku (only if no bookings)
  fastify.delete('/api/buku/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    const db = getDb();
    const buku = db.prepare('SELECT * FROM buku WHERE id = ?').get(request.params.id);
    if (!buku) return reply.code(404).send({ error: 'Not found' });

    const count = db.prepare('SELECT COUNT(*) AS n FROM bookings WHERE buku_id = ? AND deleted_at IS NULL').get(buku.id).n;
    if (count > 0) return reply.code(409).send({ error: 'Cannot delete: buku has bookings' });

    db.prepare('DELETE FROM buku WHERE id = ?').run(buku.id);
    return reply.code(204).send();
  });
}
