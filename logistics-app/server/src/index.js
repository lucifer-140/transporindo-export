import 'dotenv/config';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

import { getDb } from './db.js';
import { authRoutes } from './routes/auth.js';
import { bookingRoutes } from './routes/bookings.js';
import { userRoutes } from './routes/users.js';
import { dokumenRoutes } from './routes/dokumen.js';
import { piutangRoutes } from './routes/piutang.js';
import { hutangRoutes }  from './routes/hutang.js';
import { financeRoutes } from './routes/finance.js';
import { shipperRoutes } from './routes/shippers.js';
import { bukuRoutes } from './routes/buku.js';
import { commodityRoutes } from './routes/commodities.js';
import { eventsRoutes } from './routes/events.js';
import { invoicePajakRoutes } from './routes/invoicePajak.js';
import { notaReimbursementRoutes } from './routes/notaReimbursement.js';
import { settingsRoutes } from './routes/settings.js';
import { auditDownloadRoutes } from './routes/auditDownload.js';
import { backupRoutes } from './routes/backup.js';
import { bookingDocumentRoutes } from './routes/bookingDocuments.js';
import { hutangDokumenRoutes } from './routes/hutangDokumen.js';
import { hutangTruckingRoutes } from './routes/hutangTrucking.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT ?? '8080');
const IS_PROD = process.env.NODE_ENV === 'production';

const keyPath = resolve(process.env.HTTPS_KEY || './certs/key.pem');
const certPath = resolve(process.env.HTTPS_CERT || './certs/cert.pem');
const hasCerts = existsSync(keyPath) && existsSync(certPath);

const fastify = Fastify({
  logger: { level: IS_PROD ? 'info' : 'debug' },
  ...(hasCerts && {
    https: {
      key: readFileSync(keyPath),
      cert: readFileSync(certPath),
    },
  }),
});

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
await fastify.register(shipperRoutes);
await fastify.register(bukuRoutes);
await fastify.register(commodityRoutes);
await fastify.register(eventsRoutes);
await fastify.register(invoicePajakRoutes);
await fastify.register(notaReimbursementRoutes);
await fastify.register(settingsRoutes);
await fastify.register(auditDownloadRoutes);
await fastify.register(backupRoutes);
await fastify.register(bookingDocumentRoutes);
await fastify.register(hutangDokumenRoutes);
await fastify.register(hutangTruckingRoutes);

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
  console.log(`Server listening on https://0.0.0.0:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
