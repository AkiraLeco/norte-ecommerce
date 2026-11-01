import db from '../database/database.js';
import { HttpError } from '../utils/helpers.js';

export function computeDiscount(coupon, subtotal) {
  const raw = coupon.type === 'percent' ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
  return Math.min(raw, subtotal);
}

// Valida regras do cupom contra um subtotal (em centavos). Lança HttpError se inválido.
export function validateCoupon(code, subtotal) {
  const coupon = db.prepare('SELECT * FROM coupons WHERE code = ?').get(String(code || '').trim());
  if (!coupon || !coupon.active) throw new HttpError(404, 'Cupom inválido.');
  if (coupon.expires_at && new Date(coupon.expires_at + 'T23:59:59') < new Date()) throw new HttpError(400, 'Este cupom expirou.');
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) throw new HttpError(400, 'Este cupom atingiu o limite de utilizações.');
  if (subtotal < coupon.min_purchase) {
    throw new HttpError(400, `Compra mínima de R$ ${(coupon.min_purchase / 100).toFixed(2).replace('.', ',')} para este cupom.`);
  }
  return { coupon, discount: computeDiscount(coupon, subtotal) };
}

export const listCoupons = () => db.prepare('SELECT * FROM coupons ORDER BY id DESC').all().map((c) => ({ ...c, active: !!c.active }));

export function createCoupon(d) {
  const id = db.prepare('INSERT INTO coupons (code, type, value, min_purchase, max_uses, expires_at, active) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(d.code, d.type, d.value, d.min_purchase, d.max_uses, d.expires_at, d.active ? 1 : 0).lastInsertRowid;
  return db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);
}

export function updateCoupon(id, d) {
  const r = db.prepare('UPDATE coupons SET code = ?, type = ?, value = ?, min_purchase = ?, max_uses = ?, expires_at = ?, active = ? WHERE id = ?')
    .run(d.code, d.type, d.value, d.min_purchase, d.max_uses, d.expires_at, d.active ? 1 : 0, id);
  if (!r.changes) throw new HttpError(404, 'Cupom não encontrado.');
  return db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);
}

export function deleteCoupon(id) {
  if (!db.prepare('DELETE FROM coupons WHERE id = ?').run(id).changes) throw new HttpError(404, 'Cupom não encontrado.');
}
