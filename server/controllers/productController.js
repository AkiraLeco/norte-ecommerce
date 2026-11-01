import db from '../database/database.js';
import { HttpError, uploadUrl, removeUpload } from '../utils/helpers.js';
import * as products from '../models/productModel.js';

const isAdminRequest = (req) => req.query.admin === '1' && req.user?.role === 'admin';

export const list = (req, res) => res.json(products.listProducts(req.validQuery, { admin: isAdminRequest(req) }));

export const filters = (_req, res) => res.json(products.filterOptions());

export function get(req, res) {
  const admin = isAdminRequest(req);
  const p = products.getProduct(req.params.id, { admin });
  if (!p) throw new HttpError(404, 'Produto não encontrado.');
  if (!admin) products.incrementViews(p.id);
  res.json({ item: p });
}

export const create = (req, res) => res.status(201).json({ item: products.createProduct(req.body) });
export const update = (req, res) => res.json({ item: products.updateProduct(Number(req.params.id), req.body) });

export function remove(req, res) {
  const paths = products.deleteProduct(Number(req.params.id));
  paths.forEach(removeUpload);
  res.json({ ok: true });
}

/* ---------- Imagens ---------- */
export function addImages(req, res) {
  const productId = Number(req.params.id);
  const discard = () => req.files?.forEach((f) => removeUpload(uploadUrl('products', f.filename)));
  if (!db.prepare('SELECT 1 FROM products WHERE id = ?').get(productId)) { discard(); throw new HttpError(404, 'Produto não encontrado.'); }
  if (!req.files?.length) throw new HttpError(400, 'Nenhuma imagem enviada.');
  const colorId = Number(req.body.color_id) || null;
  if (colorId && !db.prepare('SELECT 1 FROM colors WHERE id = ?').get(colorId)) { discard(); throw new HttpError(400, 'Cor inexistente.'); }
  const next = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 n FROM product_images WHERE product_id = ?').get(productId).n;
  const ins = db.prepare('INSERT INTO product_images (product_id, color_id, path, sort_order) VALUES (?, ?, ?, ?)');
  db.transaction(() => req.files.forEach((f, i) => ins.run(productId, colorId, uploadUrl('products', f.filename), next + i)))();
  res.status(201).json({ images: db.prepare('SELECT id, color_id, path, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order, id').all(productId) });
}

export function updateImage(req, res) {
  const colorId = req.body.color_id ? Number(req.body.color_id) : null;
  const sort = req.body.sort_order != null ? Number(req.body.sort_order) : null;
  const r = db.prepare('UPDATE product_images SET color_id = ?, sort_order = COALESCE(?, sort_order) WHERE id = ? AND product_id = ?')
    .run(colorId, sort, Number(req.params.imageId), Number(req.params.id));
  if (!r.changes) throw new HttpError(404, 'Imagem não encontrada.');
  res.json({ ok: true });
}

export function removeImage(req, res) {
  const img = db.prepare('SELECT id, path FROM product_images WHERE id = ? AND product_id = ?').get(Number(req.params.imageId), Number(req.params.id));
  if (!img) throw new HttpError(404, 'Imagem não encontrada.');
  db.prepare('DELETE FROM product_images WHERE id = ?').run(img.id);
  removeUpload(img.path);
  res.json({ ok: true });
}
