import db from '../database/database.js';
import { HttpError } from '../utils/helpers.js';

export function list(req, res) {
  const where = [];
  const params = [];
  if (req.query.q) { where.push('(p.name LIKE ? OR v.sku LIKE ?)'); params.push(`%${req.query.q}%`, `%${req.query.q}%`); }
  if (req.query.low === '1') where.push('i.quantity <= i.low_stock_threshold');
  if (req.query.product_id) { where.push('p.id = ?'); params.push(Number(req.query.product_id)); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const items = db.prepare(`
    SELECT i.id, i.variant_id, i.quantity, i.low_stock_threshold, i.updated_at, v.sku, v.active,
           p.id AS product_id, p.name AS product_name, s.name AS size, c.name AS color, c.hex
    FROM inventory i JOIN product_variants v ON v.id = i.variant_id JOIN products p ON p.id = v.product_id
    JOIN sizes s ON s.id = v.size_id JOIN colors c ON c.id = v.color_id
    ${w} ORDER BY p.name, c.name, s.sort_order LIMIT 1000`).all(...params);
  res.json({ items });
}

export function update(req, res) {
  const { quantity, low_stock_threshold } = req.body;
  const id = Number(req.params.id);
  const r = db.prepare("UPDATE inventory SET quantity = ?, low_stock_threshold = COALESCE(?, low_stock_threshold), updated_at = datetime('now') WHERE id = ?")
    .run(quantity, low_stock_threshold ?? null, id);
  if (!r.changes) throw new HttpError(404, 'Registro de estoque não encontrado.');
  res.json({ item: db.prepare('SELECT * FROM inventory WHERE id = ?').get(id) });
}
