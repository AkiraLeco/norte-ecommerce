import * as coupons from '../models/couponModel.js';

export const list = (_req, res) => res.json({ items: coupons.listCoupons() });
export const create = (req, res) => res.status(201).json({ item: coupons.createCoupon(req.body) });
export const update = (req, res) => res.json({ item: coupons.updateCoupon(Number(req.params.id), req.body) });
export function remove(req, res) {
  coupons.deleteCoupon(Number(req.params.id));
  res.json({ ok: true });
}

export function validate(req, res) {
  const { coupon, discount } = coupons.validateCoupon(req.body.code, req.body.subtotal ?? 0);
  res.json({ code: coupon.code, type: coupon.type, value: coupon.value, discount });
}
