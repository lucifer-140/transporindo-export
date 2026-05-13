const ROLE_LEVEL = { worker: 1, finance: 2, admin: 3 };

export function requireRole(minRole) {
  return async function (request, reply) {
    if (!request.session?.user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const userLevel = ROLE_LEVEL[request.session.user.role] ?? 0;
    const required  = ROLE_LEVEL[minRole] ?? 99;
    if (userLevel < required) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
  };
}
