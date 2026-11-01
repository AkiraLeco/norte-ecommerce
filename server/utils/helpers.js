import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/env.js';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const slugify = (text) =>
  String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';

// Gera slug único consultando a tabela informada (nomes de tabela/coluna são constantes internas).
export function uniqueSlug(db, table, base, ignoreId = null) {
  const root = slugify(base);
  let slug = root;
  let i = 2;
  const q = db.prepare(`SELECT id FROM ${table} WHERE slug = ?`);
  for (;;) {
    const found = q.get(slug);
    if (!found || found.id === ignoreId) return slug;
    slug = `${root}-${i++}`;
  }
}

export const orderNumber = () => {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `NRT-${date}-${crypto.randomInt(0, 1e6).toString().padStart(6, '0')}`;
};

export const uploadUrl = (folder, filename) => `/uploads/${folder}/${filename}`;

// Remove um arquivo enviado (caminho público /uploads/...), ignorando qualquer coisa fora da pasta de uploads.
export function removeUpload(publicPath) {
  if (!publicPath || !publicPath.startsWith('/uploads/')) return;
  const full = path.resolve(config.uploadsDir, publicPath.replace('/uploads/', ''));
  if (!full.startsWith(config.uploadsDir + path.sep)) return;
  fs.rm(full, { force: true }, () => {});
}

export const onlyDigits = (s) => String(s ?? '').replace(/\D/g, '');

export function isValidCpf(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  for (const len of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const dv = ((sum * 10) % 11) % 10;
    if (dv !== Number(cpf[len])) return false;
  }
  return true;
}
