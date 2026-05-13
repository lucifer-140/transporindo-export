import { getDb } from '../db.js';
import { hash } from '../utils/password.js';
import { logAudit } from '../utils/audit.js';
import { z } from 'zod';

const STUB_USER_ID = 1;

const createUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8),
  full_name: z.string().optional().default(''),
  role: z.enum(['admin', 'worker']).default('worker'),
});

const updateUserSchema = z.object({
  full_name: z.string().optional(),
  role: z.enum(['admin', 'worker']).optional(),
  active: z.number().int().min(0).max(1).optional(),
});

export async function userRoutes(fastify) {
  fastify.get('/api/users', async () => {
    const db = getDb();
    return db.prepare('SELECT id, username, full_name, role, active, created_at FROM users ORDER BY created_at DESC').all();
  });

  fastify.post('/api/users', async (request, reply) => {
    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const db = getDb();
    const { username, password, full_name, role } = parsed.data;
    const password_hash = await hash(password);

    const result = db.prepare(
      'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)'
    ).run(username, password_hash, full_name, role);

    logAudit({ userId: STUB_USER_ID, action: 'create', entityType: 'user', entityId: result.lastInsertRowid });
    return reply.code(201).send(db.prepare('SELECT id, username, full_name, role, active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid));
  });

  fastify.put('/api/users/:id', async (request, reply) => {
    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(request.params.id);
    if (!user) return reply.code(404).send({ error: 'Not found' });

    const { full_name, role, active } = parsed.data;
    const sets = [];
    const params = [];
    if (full_name !== undefined) { sets.push('full_name = ?'); params.push(full_name); }
    if (role !== undefined)      { sets.push('role = ?'); params.push(role); }
    if (active !== undefined)    { sets.push('active = ?'); params.push(active); }

    if (sets.length) {
      db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...params, user.id);
      logAudit({ userId: STUB_USER_ID, action: 'update', entityType: 'user', entityId: user.id, changes: parsed.data });
    }

    return db.prepare('SELECT id, username, full_name, role, active, created_at FROM users WHERE id = ?').get(user.id);
  });

  fastify.post('/api/users/:id/password', async (request, reply) => {
    const { new_password } = request.body ?? {};
    if (!new_password || new_password.length < 8) return reply.code(400).send({ error: 'Password must be at least 8 characters' });

    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(request.params.id);
    if (!user) return reply.code(404).send({ error: 'Not found' });

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await hash(new_password), user.id);
    logAudit({ userId: STUB_USER_ID, action: 'update', entityType: 'user', entityId: user.id, changes: { password: 'changed' } });
    return reply.code(204).send();
  });
}
