import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/env.js';

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

// O arquivo .db é aberto apenas pelo processo Node; o navegador só acessa via API.
const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');

export default db;
