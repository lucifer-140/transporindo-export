import { requireAuth } from '../middleware/requireAuth.js';
import { addClient } from '../utils/sse.js';

export async function eventsRoutes(fastify) {
  fastify.get('/api/events', { preHandler: requireAuth }, async (req, reply) => {
    const raw = reply.raw;
    raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    raw.write(':\n\n');

    const remove = addClient(raw);

    const ping = setInterval(() => {
      try { raw.write(':\n\n'); } catch { clearInterval(ping); }
    }, 25000);

    req.raw.on('close', () => {
      clearInterval(ping);
      remove();
    });

    await new Promise(() => {});
  });
}
