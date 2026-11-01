import multer from 'multer';
import { config } from '../config/env.js';

export function notFound(_req, res) {
  res.status(404).json({ error: 'Recurso não encontrado.' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? `Arquivo maior que ${config.maxUploadMb}MB.` : 'Falha no upload do arquivo.';
    return res.status(400).json({ error: msg });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido.' });
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Já existe um registro com esses dados.' });
  if (err.code?.startsWith?.('SQLITE_CONSTRAINT')) return res.status(409).json({ error: 'Operação viola uma restrição de integridade.' });

  const status = err.status || 500;
  if (status >= 500) console.error('[erro]', err);
  res.status(status).json({
    error: status >= 500 && config.isProd ? 'Erro interno do servidor.' : err.message,
    ...(err.details ? { details: err.details } : {}),
  });
}
