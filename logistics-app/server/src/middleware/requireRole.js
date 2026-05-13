export function requireRole(role) {
  return async function (request, reply) {
    if (!request.session?.user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    if (request.session.user.role !== role) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
  };
}
