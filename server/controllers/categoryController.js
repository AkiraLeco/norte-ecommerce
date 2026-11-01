import db from '../database/database.js';
import { HttpError, uniqueSlug, uploadUrl, removeUpload } from '../utils/helpers.js';

const withCount = `
  SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.active = 1) AS product_count FROM categories c`;
const fmt = (c) => ({ ...c, active: !!c.active });

export function list(req, res) {
  const admin = req.query.admin === '1' && req.user?.role === 'admin';
  const rows = db.prepare(`${withCount} ${admin ? '' : 'WHERE c.active = 1'} ORDER BY c.sort_order, c.name`).all();
  res.json({ items: rows.map(fmt) });
}

export function create(req, res) {
  const { name, description, sort_order, active } = req.body;
  const image = req.file ? uploadUrl('categories', req.file.filename) : null;
  const id = db.prepare('INSERT INTO categories (name, slug, description, image, sort_order, active) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name, uniqueSlug(db, 'categories', name), description, image, sort_order, active ? 1 : 0).lastInsertRowid;
  res.status(201).json({ item: fmt(db.prepare(`${withCount} WHERE c.id = ?`).get(id)) });
}

export function update(req, res) {
  const id = Number(req.params.id);
  const cur = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!cur) {
    if (req.file) removeUpload(uploadUrl('categories', req.file.filename));
    throw new HttpError(404, 'Categoria não encontrada.');
  }
  const { name, description, sort_order, active } = req.body;
  let image = cur.image;
  if (req.file) { image = uploadUrl('categories', req.file.filename); removeUpload(cur.image); }
  else if (req.query.remove_image === '1') { removeUpload(cur.image); image = null; }
  const slug = name !== cur.name ? uniqueSlug(db, 'categories', name, id) : cur.slug;
  db.prepare('UPDATE categories SET name = ?, slug = ?, description = ?, image = ?, sort_order = ?, active = ? WHERE id = ?')
    .run(name, slug, description, image, sort_order, active ? 1 : 0, id);
  res.json({ item: fmt(db.prepare(`${withCount} WHERE c.id = ?`).get(id)) });
}

export function remove(req, res) {
  const id = Number(req.params.id);
  const cur = db.prepare('SELECT image FROM categories WHERE id = ?').get(id);
  if (!cur) throw new HttpError(404, 'Categoria não encontrada.');
  db.prepare('DELETE FROM categories WHERE id = ?').run(id); // produtos ficam sem categoria (ON DELETE SET NULL)
  removeUpload(cur.image);
  res.json({ ok: true });
}
