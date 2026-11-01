// Importa fotos reais para os produtos a partir de server/seed-photos.
// Nome do arquivo:  <slug-do-produto>__<slug-da-cor>__<n>.jpg   (cor opcional: <slug>__<n>.jpg = "Geral")
// Ex.: camiseta-essencial-pima__preto__1.jpg · camiseta-essencial-pima__preto__2.jpg · vestido-midi-fluido__1.webp
// Uso: npm run db:import-photos   (substitui as imagens atuais dos produtos/cores que tiverem fotos novas)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import db from './database.js';
import { initDatabase } from './init.js';
import { config, SERVER_DIR } from '../config/env.js';
import { slugify, removeUpload } from '../utils/helpers.js';

const SRC = path.join(SERVER_DIR, 'seed-photos');
const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

initDatabase();
if (!fs.existsSync(SRC)) {
  fs.mkdirSync(SRC, { recursive: true });
  console.log(`[fotos] Pasta criada: ${SRC}\nColoque as fotos lá (veja o nome esperado no topo deste arquivo) e rode de novo.`);
  process.exit(0);
}

const products = Object.fromEntries(db.prepare('SELECT id, slug FROM products').all().map((p) => [p.slug, p.id]));
const colors = Object.fromEntries(db.prepare('SELECT id, name FROM colors').all().map((c) => [slugify(c.name), c.id]));

const groups = new Map(); // "productId|colorId" -> [{file, n}]
const skipped = [];
for (const file of fs.readdirSync(SRC)) {
  const ext = path.extname(file).toLowerCase();
  if (!EXT.has(ext)) continue;
  const parts = path.basename(file, ext).split('__');
  const n = Number(parts.at(-1)) || 1;
  const slug = parts[0];
  const colorSlug = parts.length === 3 ? parts[1] : null;
  const pid = products[slug];
  const cid = colorSlug ? colors[colorSlug] : null;
  if (!pid || (colorSlug && !cid)) { skipped.push(file); continue; }
  const key = `${pid}|${cid ?? ''}`;
  groups.set(key, [...(groups.get(key) || []), { file, ext, n }]);
}

db.transaction(() => {
  for (const [key, files] of groups) {
    const [pid, cid] = key.split('|');
    const colorId = cid ? Number(cid) : null;
    const old = db.prepare('SELECT id, path FROM product_images WHERE product_id = ? AND color_id IS ?').all(Number(pid), colorId);
    for (const o of old) { db.prepare('DELETE FROM product_images WHERE id = ?').run(o.id); removeUpload(o.path); }
    const base = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 n FROM product_images WHERE product_id = ?').get(Number(pid)).n;
    files.sort((a, b) => a.n - b.n).forEach((f, i) => {
      const name = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${f.ext}`;
      fs.copyFileSync(path.join(SRC, f.file), path.join(config.uploadsDir, 'products', name));
      db.prepare('INSERT INTO product_images (product_id, color_id, path, sort_order) VALUES (?, ?, ?, ?)').run(Number(pid), colorId, `/uploads/products/${name}`, base + i);
    });
  }
})();

console.log(`[fotos] ${[...groups.values()].flat().length} foto(s) importada(s) em ${groups.size} grupo(s) produto/cor.`);
if (skipped.length) console.log(`[fotos] Ignorados (nome não reconhecido): ${skipped.join(', ')}`);
