import db from '../database/database.js';
import { HttpError } from '../utils/helpers.js';

const VARIANT_SQL = `
  SELECT v.id AS variant_id, v.product_id, v.size_id, v.color_id, v.active AS variant_active,
         p.name, p.slug, p.price, p.sale_price, p.active AS product_active,
         s.name AS size, c.name AS color, c.hex, COALESCE(i.quantity, 0) AS stock
  FROM product_variants v
  JOIN products p ON p.id = v.product_id
  JOIN sizes s ON s.id = v.size_id
  JOIN colors c ON c.id = v.color_id
  LEFT JOIN inventory i ON i.variant_id = v.id
  WHERE v.id = ?`;

export const getVariant = (id) => db.prepare(VARIANT_SQL).get(id);

function imageFor(productId, colorId) {
  return (
    db.prepare('SELECT path FROM product_images WHERE product_id = ? AND color_id = ? ORDER BY sort_order, id LIMIT 1').get(productId, colorId) ||
    db.prepare('SELECT path FROM product_images WHERE product_id = ? ORDER BY sort_order, id LIMIT 1').get(productId)
  )?.path || null;
}

function optionsFor(productId) {
  return db.prepare(`
    SELECT v.id AS variant_id, v.size_id, s.name AS size, v.color_id, c.name AS color, c.hex, COALESCE(i.quantity, 0) AS stock
    FROM product_variants v JOIN sizes s ON s.id = v.size_id JOIN colors c ON c.id = v.color_id
    LEFT JOIN inventory i ON i.variant_id = v.id
    WHERE v.product_id = ? AND v.active = 1 ORDER BY c.id, s.sort_order`).all(productId);
}

// Converte linhas [{id?, variant_id, quantity}] em itens completos, com preço sempre vindo do banco.
export function resolveItems(rows) {
  const items = [];
  for (const row of rows) {
    const v = getVariant(row.variant_id);
    if (!v) continue;
    const unit = v.sale_price ?? v.price;
    const available = !!(v.variant_active && v.product_active && v.stock > 0);
    items.push({
      id: row.id ?? row.variant_id,
      variant_id: v.variant_id,
      product_id: v.product_id,
      slug: v.slug,
      name: v.name,
      size: v.size,
      color: v.color,
      hex: v.hex,
      size_id: v.size_id,
      color_id: v.color_id,
      image: imageFor(v.product_id, v.color_id),
      unit_price: unit,
      original_price: v.price,
      quantity: row.quantity,
      line_total: unit * row.quantity,
      stock: v.stock,
      available,
      exceeds_stock: row.quantity > v.stock,
      options: optionsFor(v.product_id),
    });
  }
  return items;
}

export function summarize(items) {
  return {
    items,
    count: items.reduce((n, i) => n + i.quantity, 0),
    subtotal: items.reduce((n, i) => n + i.line_total, 0),
  };
}

function cartIdFor(userId) {
  const found = db.prepare('SELECT id FROM carts WHERE user_id = ?').get(userId);
  if (found) return found.id;
  return Number(db.prepare('INSERT INTO carts (user_id) VALUES (?)').run(userId).lastInsertRowid);
}

const touch = (cartId) => db.prepare("UPDATE carts SET updated_at = datetime('now') WHERE id = ?").run(cartId);

export function getCart(userId) {
  const rows = db.prepare(`
    SELECT ci.id, ci.variant_id, ci.quantity FROM cart_items ci JOIN carts c ON c.id = ci.cart_id
    WHERE c.user_id = ? ORDER BY ci.id`).all(userId);
  return summarize(resolveItems(rows));
}

export function rawCartRows(userId) {
  return db.prepare(`
    SELECT ci.id, ci.variant_id, ci.quantity FROM cart_items ci JOIN carts c ON c.id = ci.cart_id
    WHERE c.user_id = ?`).all(userId);
}

function assertBuyable(v, wanted) {
  if (!v || !v.variant_active || !v.product_active) throw new HttpError(404, 'Produto indisponível.');
  if (v.stock <= 0) throw new HttpError(409, 'Este item está esgotado.');
  if (wanted > v.stock) throw new HttpError(409, `Estoque insuficiente. Restam ${v.stock} unidade(s).`);
}

export function addItem(userId, variantId, quantity) {
  const v = getVariant(variantId);
  db.transaction(() => {
    const cartId = cartIdFor(userId);
    const existing = db.prepare('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND variant_id = ?').get(cartId, variantId);
    assertBuyable(v, (existing?.quantity || 0) + quantity);
    if (existing) db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(existing.quantity + quantity, existing.id);
    else db.prepare('INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (?, ?, ?)').run(cartId, variantId, quantity);
    touch(cartId);
  })();
  return getCart(userId);
}

export function updateItem(userId, itemId, { quantity, variant_id }) {
  db.transaction(() => {
    const item = db.prepare(`
      SELECT ci.id, ci.cart_id, ci.variant_id, ci.quantity FROM cart_items ci JOIN carts c ON c.id = ci.cart_id
      WHERE ci.id = ? AND c.user_id = ?`).get(itemId, userId);
    if (!item) throw new HttpError(404, 'Item não encontrado no carrinho.');

    let targetVariant = item.variant_id;
    if (variant_id && variant_id !== item.variant_id) {
      const from = getVariant(item.variant_id);
      const to = getVariant(variant_id);
      if (!to || to.product_id !== from.product_id) throw new HttpError(400, 'Variação inválida para este produto.');
      targetVariant = variant_id;
    }
    const qty = quantity ?? item.quantity;
    assertBuyable(getVariant(targetVariant), qty);

    const clash = db.prepare('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND variant_id = ? AND id != ?').get(item.cart_id, targetVariant, itemId);
    if (clash) {
      assertBuyable(getVariant(targetVariant), clash.quantity + qty);
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(clash.quantity + qty, clash.id);
      db.prepare('DELETE FROM cart_items WHERE id = ?').run(itemId);
    } else {
      db.prepare('UPDATE cart_items SET variant_id = ?, quantity = ? WHERE id = ?').run(targetVariant, qty, itemId);
    }
    touch(item.cart_id);
  })();
  return getCart(userId);
}

export function removeItem(userId, itemId) {
  const r = db.prepare('DELETE FROM cart_items WHERE id = ? AND cart_id IN (SELECT id FROM carts WHERE user_id = ?)').run(itemId, userId);
  if (!r.changes) throw new HttpError(404, 'Item não encontrado no carrinho.');
  return getCart(userId);
}

export function clearCart(userId) {
  db.prepare('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = ?)').run(userId);
}

// Mescla o carrinho de visitante (localStorage) no carrinho do usuário após o login.
export function syncGuestItems(userId, guestItems) {
  db.transaction(() => {
    const cartId = cartIdFor(userId);
    for (const g of guestItems) {
      const v = getVariant(g.variant_id);
      if (!v || !v.variant_active || !v.product_active || v.stock <= 0) continue;
      const existing = db.prepare('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND variant_id = ?').get(cartId, g.variant_id);
      const qty = Math.min((existing?.quantity || 0) + g.quantity, v.stock);
      if (existing) db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(qty, existing.id);
      else db.prepare('INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (?, ?, ?)').run(cartId, g.variant_id, qty);
    }
    touch(cartId);
  })();
  return getCart(userId);
}
