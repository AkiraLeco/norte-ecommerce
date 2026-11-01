import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/env.js';
import { HttpError } from '../utils/helpers.js';

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif', 'image/gif': '.gif' };

// folder: products | categories | banners
export function imageUploader(folder) {
  const dir = path.join(config.uploadsDir, folder);
  fs.mkdirSync(dir, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination: dir,
      filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ALLOWED[file.mimetype]}`),
    }),
    limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 12 },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED[file.mimetype]) return cb(new HttpError(400, 'Formato inválido. Envie JPG, PNG, WEBP, AVIF ou GIF.'));
      cb(null, true);
    },
  });
}

export const uploaders = {
  products: imageUploader('products'),
  categories: imageUploader('categories'),
  banners: imageUploader('banners'),
};
