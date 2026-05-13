export async function requireAuth(request, reply) {
  if (!request.session?.user) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}
