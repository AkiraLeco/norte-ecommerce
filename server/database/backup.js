import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from './database.js';
import { config } from '../config/env.js';

export const BACKUP_DIR = path.join(path.dirname(config.dbPath), 'backups');

// Backup consistente (API online do SQLite), seguro mesmo com o servidor em uso.
export async function backupDatabase(prefix = 'loja') {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(BACKUP_DIR, `${prefix}-${stamp}.db`);
  await db.backup(file);

  // Mantém apenas os 20 backups mais recentes.
  const all = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.db')).sort();
  for (const old of all.slice(0, Math.max(0, all.length - 20))) fs.rmSync(path.join(BACKUP_DIR, old));
  return file;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  backupDatabase().then((f) => console.log(`[db] Backup criado: ${f}`));
}
