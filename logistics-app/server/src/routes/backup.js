import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, readdirSync, statSync, mkdirSync, existsSync, createReadStream } from 'fs';
import { join, basename } from 'path';
import { requireRole } from '../middleware/requireRole.js';
import { logAudit } from '../utils/audit.js';

const DB_PATH = process.env.DB_PATH ?? './data/app.db';
const BACKUPS_DIR = join(DB_PATH, '..', 'backups');

function ensureBackupsDir() {
  mkdirSync(BACKUPS_DIR, { recursive: true });
}

function listBackups() {
  ensureBackupsDir();
  return readdirSync(BACKUPS_DIR)
    .filter((f) => f.endsWith('.db'))
    .map((filename) => {
      const stat = statSync(join(BACKUPS_DIR, filename));
      return { filename, size: stat.size, createdAt: stat.birthtime ?? stat.mtime };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function backupRoutes(fastify) {
  fastify.get('/api/backups', { preHandler: requireRole('admin') }, async () => {
    return listBackups();
  });

  fastify.post('/api/backup', { preHandler: requireRole('admin') }, async (request, reply) => {
    ensureBackupsDir();

    const now = new Date();
    const ts = now.toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19);
    const destPath = join(BACKUPS_DIR, `backup-${ts}.db`);

    // Checkpoint WAL then copy — DatabaseSync opens a second connection briefly
    const tmp = new DatabaseSync(DB_PATH);
    tmp.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    tmp.close();

    copyFileSync(DB_PATH, destPath);

    const stat = statSync(destPath);
    const result = {
      filename: basename(destPath),
      size: stat.size,
      createdAt: stat.birthtime ?? stat.mtime,
    };

    logAudit({
      userId: request.session.user.id,
      action: 'backup',
      entityType: 'system',
      entityId: null,
      changes: { filename: result.filename, size: result.size },
    });

    return reply.code(201).send(result);
  });

  fastify.get('/api/backup/download/:filename', { preHandler: requireRole('admin') }, async (request, reply) => {
    const { filename } = request.params;

    // Prevent path traversal
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return reply.code(400).send({ error: 'Invalid filename' });
    }
    if (!filename.endsWith('.db')) {
      return reply.code(400).send({ error: 'Invalid file type' });
    }

    const filePath = join(BACKUPS_DIR, filename);
    if (!existsSync(filePath)) {
      return reply.code(404).send({ error: 'Backup not found' });
    }

    const stat = statSync(filePath);
    reply.header('Content-Type', 'application/octet-stream');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    reply.header('Content-Length', stat.size);
    return reply.send(createReadStream(filePath));
  });
}
