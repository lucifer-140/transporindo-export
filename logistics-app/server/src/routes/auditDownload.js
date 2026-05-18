import { logAudit } from '../utils/audit.js';
import { requireAuth } from '../middleware/requireAuth.js';

export async function auditDownloadRoutes(fastify) {
  fastify.post('/api/audit/download', { preHandler: requireAuth }, async (request, reply) => {
    const { documentType, bookingId, entityId } = request.body ?? {};
    if (!documentType) return reply.code(400).send({ error: 'documentType required' });

    logAudit({
      userId: request.session.user.id,
      action: 'download',
      entityType: documentType,
      entityId: bookingId ?? entityId ?? null,
      changes: { documentType },
    });

    return { ok: true };
  });
}
