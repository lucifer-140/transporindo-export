import { getDb } from '../db.js';
import { verify } from '../utils/password.js';
import { logAudit } from '../utils/audit.js';

export async function authRoutes(fastify) {
  fastify.post('/api/auth/login', async (request, reply) => {
    const { username, password } = request.body ?? {};
    if (!username || !password) {
      return reply.code(400).send({ error: 'username and password required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
    if (!user || !(await verify(password, user.password_hash))) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    request.session.user = { id: user.id, username: user.username, full_name: user.full_name, role: user.role };
    logAudit({ userId: user.id, action: 'login', entityType: 'auth', entityId: user.id });
    return { user: request.session.user };
  });

  fastify.post('/api/auth/logout', async (request, reply) => {
    const userId = request.session?.user?.id ?? null;
    logAudit({ userId, action: 'logout', entityType: 'auth', entityId: userId });
    await request.session.destroy();
    return reply.code(204).send();
  });

  fastify.get('/api/auth/me', async (request, reply) => {
    if (!request.session?.user) return reply.code(401).send({ error: 'Unauthorized' });
    return { user: request.session.user };
  });
}
