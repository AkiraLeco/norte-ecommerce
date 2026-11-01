import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import db from '../database/database.js';
import { HttpError } from '../utils/helpers.js';

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

function readUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    // Sempre confere no banco: usuário removido/desativado ou papel alterado perde acesso imediatamente.
    return db.prepare('SELECT id, name, email, phone, cpf, role, created_at FROM users WHERE id = ? AND active = 1').get(payload.sub) || null;
  } catch {
    return null;
  }
}

export function optionalAuth(req, _res, next) {
  req.user = readUser(req);
  next();
}

export function requireAuth(req, _res, next) {
  req.user = readUser(req);
  if (!req.user) throw new HttpError(401, 'Sessão inválida ou expirada. Faça login novamente.');
  next();
}

export function requireAdmin(req, _res, next) {
  req.user = readUser(req);
  if (!req.user) throw new HttpError(401, 'Sessão inválida ou expirada. Faça login novamente.');
  if (req.user.role !== 'admin') throw new HttpError(403, 'Acesso restrito a administradores.');
  next();
}
