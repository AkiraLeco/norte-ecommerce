import { createOrder, getOrder, listOrders, updateStatus } from '../models/orderModel.js';
import { HttpError } from '../utils/helpers.js';

export const create = (req, res) => res.status(201).json({ item: createOrder(req.user, req.body) });

export function list(req, res) {
  const isAdminScope = req.user.role === 'admin' && req.query.scope === 'all';
  res.json(listOrders({
    userId: isAdminScope ? null : req.user.id,
    status: req.query.status || null,
    q: isAdminScope ? req.query.q || null : null,
    page: Math.max(1, Number(req.query.page) || 1),
    limit: Math.min(100, Number(req.query.limit) || 20),
  }));
}

export function get(req, res) {
  const order = getOrder(Number(req.params.id), { userId: req.user.role === 'admin' ? null : req.user.id });
  if (!order) throw new HttpError(404, 'Pedido não encontrado.');
  res.json({ item: order });
}

export const setStatus = (req, res) =>
  res.json({ item: updateStatus(Number(req.params.id), req.body.status, { note: req.body.note, tracking_code: req.body.tracking_code }) });
