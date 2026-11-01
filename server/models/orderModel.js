import db from '../database/database.js';
import { HttpError, orderNumber, onlyDigits } from '../utils/helpers.js';
import { getVariant, rawCartRows, resolveItems, clearCart } from './cartModel.js';
import { validateCoupon } from './couponModel.js';
import { paymentMethods, shippingFor } from './settingsModel.js';

export const STATUSES = ['aguardando_pagamento', 'pagamento_confirmado', 'em_preparacao', 'enviado', 'entregue', 'cancelado'];

export const STATUS_LABELS = {
  aguardando_pagamento: 'Aguardando pagamento',
  pagamento_confirmado: 'Pagamento confirmado',
  em_preparacao: 'Em preparação',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

// Cria o pedido numa única transação: valida estoque, preços, cupom e frete no servidor.
export function createOrder(user, input) {
  const method = paymentMethods({ onlyEnabled: true }).find((m) => m.id === input.payment_method);
  if (!method) throw new HttpError(400, 'Forma de pagamento indisponível.');

  return db.transaction(() => {
    const rows = rawCartRows(user.id);
    if (!rows.length) throw new HttpError(400, 'Seu carrinho está vazio.');

    // Consolida preço e estoque a partir do banco, ignorando qualquer valor vindo do cliente.
    const lines = resolveItems(rows);
    for (const l of lines) {
      if (!l.available) throw new HttpError(409, `"${l.name}" (${l.size} / ${l.color}) não está mais disponível.`);
    }
    const decStock = db.prepare("UPDATE inventory SET quantity = quantity - ?, updated_at = datetime('now') WHERE variant_id = ? AND quantity >= ?");
    for (const l of lines) {
      if (!decStock.run(l.quantity, l.variant_id, l.quantity).changes) {
        throw new HttpError(409, `Estoque insuficiente para "${l.name}" (${l.size} / ${l.color}). Restam ${getVariant(l.variant_id).stock}.`);
      }
    }

    const subtotal = lines.reduce((n, l) => n + l.line_total, 0);
    let discount = 0;
    let coupon = null;
    if (input.coupon_code) {
      const v = validateCoupon(input.coupon_code, subtotal);
      coupon = v.coupon;
      discount = v.discount;
      const used = db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ? AND (max_uses IS NULL OR used_count < max_uses)').run(coupon.id);
      if (!used.changes) throw new HttpError(400, 'Este cupom atingiu o limite de utilizações.');
    }
    const shipping = shippingFor(subtotal);
    const total = subtotal - discount + shipping;

    let number;
    do number = orderNumber(); while (db.prepare('SELECT 1 FROM orders WHERE number = ?').get(number));

    const s = input.shipping_address;
    const orderId = Number(db.prepare(`
      INSERT INTO orders (number, user_id, payment_method, subtotal, discount, shipping, total, coupon_id, coupon_code,
        customer_name, customer_email, customer_phone, customer_cpf,
        ship_zip, ship_street, ship_number, ship_complement, ship_district, ship_city, ship_state, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(number, user.id, method.id, subtotal, discount, shipping, total, coupon?.id ?? null, coupon?.code ?? null,
        input.customer_name, input.customer_email, onlyDigits(input.customer_phone), onlyDigits(input.customer_cpf) || null,
        onlyDigits(s.zip), s.street, s.number, s.complement || null, s.district, s.city, s.state.toUpperCase(), input.notes || null)
      .lastInsertRowid);

    const insItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, variant_id, name, size, color, image, unit_price, quantity, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const bump = db.prepare('UPDATE products SET sales_count = sales_count + ? WHERE id = ?');
    for (const l of lines) {
      insItem.run(orderId, l.product_id, l.variant_id, l.name, l.size, l.color, l.image, l.unit_price, l.quantity, l.line_total);
      bump.run(l.quantity, l.product_id);
    }
    db.prepare('INSERT INTO order_history (order_id, status, note) VALUES (?, ?, ?)').run(orderId, 'aguardando_pagamento', 'Pedido realizado.');

    clearCart(user.id);
    return getOrder(orderId);
  })();
}

function loadItems(orderId) {
  return db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(orderId);
}

export function getOrder(id, { userId = null } = {}) {
  const o = db.prepare(`
    SELECT o.*, u.name AS account_name FROM orders o LEFT JOIN users u ON u.id = o.user_id
    WHERE o.id = ? ${userId ? 'AND o.user_id = ?' : ''}`).get(...(userId ? [id, userId] : [id]));
  if (!o) return null;
  return {
    ...o,
    status_label: STATUS_LABELS[o.status],
    items: loadItems(o.id),
    history: db.prepare('SELECT status, note, created_at FROM order_history WHERE order_id = ? ORDER BY id').all(o.id)
      .map((h) => ({ ...h, status_label: STATUS_LABELS[h.status] || h.status })),
  };
}

export function listOrders({ userId = null, status = null, q = null, page = 1, limit = 20 }) {
  const where = [];
  const params = [];
  if (userId) { where.push('o.user_id = ?'); params.push(userId); }
  if (status) { where.push('o.status = ?'); params.push(status); }
  if (q) { where.push('(o.number LIKE ? OR o.customer_name LIKE ? OR o.customer_email LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) n FROM orders o ${w}`).get(...params).n;
  const rows = db.prepare(`SELECT o.* FROM orders o ${w} ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, (page - 1) * limit);
  const items = rows.map((o) => ({
    ...o,
    status_label: STATUS_LABELS[o.status],
    items: loadItems(o.id),
  }));
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

// Atualiza status; cancelar devolve estoque e cupom na mesma transação.
export function updateStatus(id, status, { note, tracking_code } = {}) {
  return db.transaction(() => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) throw new HttpError(404, 'Pedido não encontrado.');
    if (order.status === status && !tracking_code) throw new HttpError(400, 'O pedido já está neste status.');
    if (order.status === 'cancelado') throw new HttpError(400, 'Pedidos cancelados não podem ser alterados.');

    if (status === 'cancelado') {
      if (['enviado', 'entregue'].includes(order.status)) throw new HttpError(400, 'Pedidos enviados ou entregues não podem ser cancelados.');
      const restore = db.prepare("UPDATE inventory SET quantity = quantity + ?, updated_at = datetime('now') WHERE variant_id = ?");
      const unbump = db.prepare('UPDATE products SET sales_count = MAX(0, sales_count - ?) WHERE id = ?');
      for (const it of loadItems(id)) {
        if (it.variant_id) restore.run(it.quantity, it.variant_id);
        if (it.product_id) unbump.run(it.quantity, it.product_id);
      }
      if (order.coupon_id) db.prepare('UPDATE coupons SET used_count = MAX(0, used_count - 1) WHERE id = ?').run(order.coupon_id);
    }

    db.prepare("UPDATE orders SET status = ?, tracking_code = COALESCE(?, tracking_code), updated_at = datetime('now') WHERE id = ?")
      .run(status, tracking_code || null, id);
    db.prepare('INSERT INTO order_history (order_id, status, note) VALUES (?, ?, ?)').run(id, status, note || null);
    return getOrder(id);
  })();
}
