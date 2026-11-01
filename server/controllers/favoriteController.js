import db from '../database/database.js';
import { HttpError } from '../utils/helpers.js';
import { listProducts } from '../models/productModel.js';

export function list(req, res) {
  const ids = db.prepare('SELECT product_id FROM favorites WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id).map((r) => r.product_id);
  if (!ids.length) return res.json({ items: [], ids: [] });
  const { items } = listProducts({ page: 1, limit: 60, sort: 'recent', ids });
  const byId = new Map(items.map((p) => [p.id, p]));
  res.json({ items: ids.map((id) => byId.get(id)).filter(Boolean), ids });
}

export function add(req, res) {
  const pid = req.body.product_id;
  if (!db.prepare('SELECT 1 FROM products WHERE id = ? AND active = 1').get(pid)) throw new HttpError(404, 'Produto não encontrado.');
  db.prepare('INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)').run(req.user.id, pid);
  res.status(201).json({ ok: true });
}

// :id = id do produto favoritado
export function remove(req, res) {
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?').run(req.user.id, Number(req.params.id));
  res.json({ ok: true });
}
