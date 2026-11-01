import dotenv from 'dotenv';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_DIR = path.resolve(here, '..');
export const ROOT_DIR = path.resolve(SERVER_DIR, '..');

dotenv.config({ path: path.join(ROOT_DIR, '.env'), quiet: true });

const isProd = process.env.NODE_ENV === 'production';

// Sem JWT_SECRET definido, gera um segredo persistente local (apenas conveniência de desenvolvimento).
function resolveJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (isProd) throw new Error('Defina JWT_SECRET no ambiente de produção.');
  const file = path.join(SERVER_DIR, 'database', '.jwt-secret');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  const secret = crypto.randomBytes(48).toString('hex');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, secret);
  return secret;
}

export const config = {
  isProd,
  port: Number(process.env.PORT) || 3001,
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
  dbPath: process.env.DB_PATH ? path.resolve(ROOT_DIR, process.env.DB_PATH) : path.join(SERVER_DIR, 'database', 'loja.db'),
  uploadsDir: path.join(SERVER_DIR, 'uploads'),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 5,
  autoSeed: process.env.AUTO_SEED !== 'false',
  admin: {
    name: process.env.ADMIN_NAME || 'Administrador',
    email: process.env.ADMIN_EMAIL || 'admin@loja.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },
};
