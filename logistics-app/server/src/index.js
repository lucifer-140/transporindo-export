import 'dotenv/config';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

import { getDb } from './db.js';
import { authRoutes } from './routes/auth.js';
import { bookingRoutes } from './routes/bookings.js';
import { userRoutes } from './routes/users.js';
import { dokumenRoutes } from './routes/dokumen.js';
import { piutangRoutes } from './routes/piutang.js';
import { hutangRoutes }  from './routes/hutang.js';
import { financeRoutes } from './routes/finance.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT ?? '8080');
const IS_PROD = process.env.NODE_ENV === 'production';

const fastify = Fastify({ logger: { level: IS_PROD ? 'info' : 'debug' } });

await fastify.register(fastifyCors, {
  origin: IS_PROD ? false : 'http://localhost:5173',
  credentials: true,
});

await fastify.register(fastifyCookie);
await fastify.register(fastifySession, {
  secret: process.env.SESSION_SECRET,
  cookie: {
    secure: IS_PROD,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  },
  saveUninitialized: false,
});

// Initialize DB
getDb();

// Routes
await fastify.register(authRoutes);
await fastify.register(bookingRoutes);
await fastify.register(userRoutes);
await fastify.register(dokumenRoutes);
await fastify.register(piutangRoutes);
await fastify.register(hutangRoutes);
await fastify.register(financeRoutes);

// Serve built React app in production
const publicDir = join(__dirname, '..', 'public');
if (IS_PROD && existsSync(publicDir)) {
  await fastify.register(fastifyStatic, { root: publicDir, prefix: '/' });
  fastify.setNotFoundHandler((_, reply) => {
    reply.sendFile('index.html');
  });
} else {
  fastify.get('/', async () => ({ status: 'Logistics API running', mode: process.env.NODE_ENV }));
}

try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
