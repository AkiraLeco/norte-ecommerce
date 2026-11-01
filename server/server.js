import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { config, ROOT_DIR } from './config/env.js';
import db from './database/database.js';
import { initDatabase } from './database/init.js';
import { seedDemo } from './database/seed.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';

initDatabase();
if (config.autoSeed && !db.prepare('SELECT 1 FROM products LIMIT 1').get()) {
  console.log('[db] Catálogo vazio: inserindo dados demonstrativos…');
  await seedDemo();
}

export const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(cors({ origin: config.clientOrigin, credentials: false }));
app.use(express.json({ limit: '1mb' }));

app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: true, legacyHeaders: false }));
app.use('/uploads', express.static(config.uploadsDir, { maxAge: '7d', fallthrough: true }));
app.use('/api', routes);
app.use('/api', notFound);

// Em produção (npm start) o servidor também entrega o build do React.
const dist = path.join(ROOT_DIR, 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => (req.method === 'GET' && !req.path.startsWith('/uploads') ? res.sendFile(path.join(dist, 'index.html')) : next()));
}

app.use(errorHandler);

if (process.env.NODE_TEST !== '1') {
  app.listen(config.port, () => {
    console.log(`[api] Loja rodando em http://localhost:${config.port}  (banco: ${path.relative(ROOT_DIR, config.dbPath)})`);
  });
}
