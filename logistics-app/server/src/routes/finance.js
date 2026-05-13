import { getDb } from '../db.js';

export async function financeRoutes(fastify) {
  fastify.get('/api/finance/summary', async () => {
    const db = getDb();

    const { total_piutang } = db.prepare('SELECT COALESCE(SUM(jumlah),0) AS total_piutang FROM piutang').get();
    const { total_hutang }  = db.prepare('SELECT COALESCE(SUM(jumlah),0) AS total_hutang FROM hutang').get();
    const { total_paid_piutang } = db.prepare("SELECT COALESCE(SUM(jumlah),0) AS total_paid_piutang FROM pembayaran WHERE entity_type='piutang'").get();
    const { total_paid_hutang }  = db.prepare("SELECT COALESCE(SUM(jumlah),0) AS total_paid_hutang FROM pembayaran WHERE entity_type='hutang'").get();

    return {
      piutang: {
        total: total_piutang,
        paid: total_paid_piutang,
        outstanding: Math.max(0, total_piutang - total_paid_piutang),
      },
      hutang: {
        total: total_hutang,
        paid: total_paid_hutang,
        outstanding: Math.max(0, total_hutang - total_paid_hutang),
      },
    };
  });
}
