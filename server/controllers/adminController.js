import db from '../database/database.js';
import { HttpError, uploadUrl, removeUpload } from '../utils/helpers.js';
import { getAllSettings, updateSettings, paymentMethods } from '../models/settingsModel.js';
import { STATUS_LABELS } from '../models/orderModel.js';
import { backupDatabase } from '../database/backup.js';

const PAID = "('pagamento_confirmado','em_preparacao','enviado','entregue')";

export function dashboard(_req, res) {
  const one = (sql, ...p) => db.prepare(sql).get(...p);
  const totals = one(`
    SELECT
      COUNT(*) AS orders_received,
      SUM(CASE WHEN status = 'aguardando_pagamento' THEN 1 ELSE 0 END) AS orders_pending,
      SUM(CASE WHEN status = 'entregue' THEN 1 ELSE 0 END) AS orders_completed,
      SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END) AS orders_cancelled,
      SUM(CASE WHEN status IN ${PAID} THEN 1 ELSE 0 END) AS total_sales,
      COALESCE(SUM(CASE WHEN status IN ${PAID} THEN total ELSE 0 END), 0) AS revenue,
      COALESCE(SUM(CASE WHEN status = 'aguardando_pagamento' THEN total ELSE 0 END), 0) AS revenue_pending
    FROM orders`);
  const products = one('SELECT COUNT(*) n, SUM(active) active FROM products');
  const lowStock = db.prepare(`
    SELECT p.id AS product_id, p.name, s.name AS size, c.name AS color, i.quantity, i.low_stock_threshold
    FROM inventory i JOIN product_variants v ON v.id = i.variant_id JOIN products p ON p.id = v.product_id
    JOIN sizes s ON s.id = v.size_id JOIN colors c ON c.id = v.color_id
    WHERE v.active = 1 AND p.active = 1 AND i.quantity <= i.low_stock_threshold ORDER BY i.quantity, p.name LIMIT 100`).all();
  const lowProducts = new Set(lowStock.map((l) => l.product_id)).size;

  const topProducts = db.prepare(`
    SELECT oi.product_id, oi.name, SUM(oi.quantity) AS units, SUM(oi.total) AS revenue,
      (SELECT path FROM product_images pi WHERE pi.product_id = oi.product_id ORDER BY sort_order, id LIMIT 1) AS image
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.status != 'cancelado' GROUP BY oi.product_id, oi.name ORDER BY units DESC LIMIT 5`).all();

  // Últimos 14 dias, incluindo dias sem venda.
  const rows = db.prepare(`
    SELECT date(created_at) AS day, COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue
    FROM orders WHERE status != 'cancelado' AND date(created_at) >= date('now', '-13 days') GROUP BY day`).all();
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const salesByDay = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10); // created_at é gravado em UTC pelo SQLite
    salesByDay.push({ day: key, orders: byDay.get(key)?.orders || 0, revenue: byDay.get(key)?.revenue || 0 });
  }

  const statusBreakdown = db.prepare('SELECT status, COUNT(*) AS n FROM orders GROUP BY status').all()
    .map((r) => ({ ...r, label: STATUS_LABELS[r.status] }));
  const recentOrders = db.prepare('SELECT id, number, customer_name, total, status, created_at FROM orders ORDER BY id DESC LIMIT 6').all()
    .map((o) => ({ ...o, status_label: STATUS_LABELS[o.status] }));

  res.json({
    totals: {
      ...totals,
      products: products.n,
      products_active: products.active || 0,
      low_stock_products: lowProducts,
      low_stock_variants: lowStock.length,
      customers: one("SELECT COUNT(*) n FROM users WHERE role = 'customer'").n,
    },
    lowStock: lowStock.slice(0, 8),
    topProducts,
    salesByDay,
    statusBreakdown,
    recentOrders,
  });
}

export function customers(req, res) {
  const q = req.query.q ? `%${req.query.q}%` : null;
  const items = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.active, u.created_at,
      COUNT(o.id) AS orders_count, COALESCE(SUM(CASE WHEN o.status != 'cancelado' THEN o.total END), 0) AS total_spent
    FROM users u LEFT JOIN orders o ON o.user_id = u.id
    WHERE u.role = 'customer' ${q ? 'AND (u.name LIKE ? OR u.email LIKE ?)' : ''}
    GROUP BY u.id ORDER BY u.created_at DESC LIMIT 500`).all(...(q ? [q, q] : []));
  res.json({ items: items.map((c) => ({ ...c, active: !!c.active })) });
}

export function setCustomerActive(req, res) {
  const r = db.prepare("UPDATE users SET active = ? WHERE id = ? AND role = 'customer'").run(req.body.active ? 1 : 0, Number(req.params.id));
  if (!r.changes) throw new HttpError(404, 'Cliente não encontrado.');
  res.json({ ok: true });
}

/* ---------- Configurações ---------- */
export function getSettings(_req, res) {
  res.json({ settings: { ...getAllSettings(), payment_methods: paymentMethods() } });
}

export function putSettings(req, res) {
  const values = { ...req.body };
  if (values.payment_methods) values.payment_methods = JSON.stringify(values.payment_methods);
  updateSettings(values);
  res.json({ settings: { ...getAllSettings(), payment_methods: paymentMethods() } });
}

export function uploadLogo(req, res) {
  if (!req.file) throw new HttpError(400, 'Nenhuma imagem enviada.');
  const old = getAllSettings().logo;
  const path = uploadUrl('banners', req.file.filename);
  updateSettings({ logo: path });
  removeUpload(old);
  res.json({ logo: path });
}

export function removeLogo(_req, res) {
  removeUpload(getAllSettings().logo);
  updateSettings({ logo: '' });
  res.json({ ok: true });
}

/* ---------- Banners ---------- */
const fmtBanner = (b) => ({ ...b, active: !!b.active });

export function listBanners(req, res) {
  const admin = req.query.admin === '1' && req.user?.role === 'admin';
  const rows = db.prepare(`SELECT * FROM banners ${admin ? '' : 'WHERE active = 1'} ORDER BY slot, sort_order, id`).all();
  res.json({ items: rows.map(fmtBanner) });
}

export function createBanner(req, res) {
  const b = req.body;
  const image = req.file ? uploadUrl('banners', req.file.filename) : null;
  const id = db.prepare('INSERT INTO banners (slot, title, subtitle, cta_label, link, image, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(b.slot, b.title, b.subtitle, b.cta_label, b.link, image, b.sort_order, b.active ? 1 : 0).lastInsertRowid;
  res.status(201).json({ item: fmtBanner(db.prepare('SELECT * FROM banners WHERE id = ?').get(id)) });
}

export function updateBanner(req, res) {
  const id = Number(req.params.id);
  const cur = db.prepare('SELECT * FROM banners WHERE id = ?').get(id);
  if (!cur) {
    if (req.file) removeUpload(uploadUrl('banners', req.file.filename));
    throw new HttpError(404, 'Banner não encontrado.');
  }
  const b = req.body;
  let image = cur.image;
  if (req.file) { image = uploadUrl('banners', req.file.filename); removeUpload(cur.image); }
  db.prepare('UPDATE banners SET slot = ?, title = ?, subtitle = ?, cta_label = ?, link = ?, image = ?, sort_order = ?, active = ? WHERE id = ?')
    .run(b.slot, b.title, b.subtitle, b.cta_label, b.link, image, b.sort_order, b.active ? 1 : 0, id);
  res.json({ item: fmtBanner(db.prepare('SELECT * FROM banners WHERE id = ?').get(id)) });
}

export function deleteBanner(req, res) {
  const cur = db.prepare('SELECT image FROM banners WHERE id = ?').get(Number(req.params.id));
  if (!cur) throw new HttpError(404, 'Banner não encontrado.');
  db.prepare('DELETE FROM banners WHERE id = ?').run(Number(req.params.id));
  removeUpload(cur.image);
  res.json({ ok: true });
}

/* ---------- Tamanhos e cores ---------- */
export const listSizes = (_req, res) => res.json({ items: db.prepare('SELECT * FROM sizes ORDER BY sort_order, id').all() });
export const listColors = (_req, res) => res.json({ items: db.prepare('SELECT * FROM colors ORDER BY name').all() });

export function createSize(req, res) {
  const id = db.prepare('INSERT INTO sizes (name, sort_order) VALUES (?, ?)').run(req.body.name, req.body.sort_order).lastInsertRowid;
  res.status(201).json({ item: db.prepare('SELECT * FROM sizes WHERE id = ?').get(id) });
}

export function createColor(req, res) {
  const id = db.prepare('INSERT INTO colors (name, hex) VALUES (?, ?)').run(req.body.name, req.body.hex).lastInsertRowid;
  res.status(201).json({ item: db.prepare('SELECT * FROM colors WHERE id = ?').get(id) });
}

/* ---------- Backup ---------- */
export async function backup(_req, res) {
  const file = await backupDatabase();
  res.json({ ok: true, file: file.split(/[\\/]/).pop() });
}
