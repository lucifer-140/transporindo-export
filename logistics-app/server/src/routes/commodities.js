import { getDb } from '../db.js';
import { requireRole } from '../middleware/requireRole.js';

export async function commodityRoutes(fastify) {
  fastify.get('/api/commodities', { preHandler: requireRole('admin') }, async () => {
    const db = getDb();
    return db.prepare('SELECT * FROM commodities ORDER BY name ASC').all();
  });


}
