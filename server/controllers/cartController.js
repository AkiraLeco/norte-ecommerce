import * as cart from '../models/cartModel.js';
import { shippingFor } from '../models/settingsModel.js';
import { HttpError } from '../utils/helpers.js';

export const get = (req, res) => res.json(cart.getCart(req.user.id));
export const add = (req, res) => res.status(201).json(cart.addItem(req.user.id, req.body.variant_id, req.body.quantity));
export const update = (req, res) => res.json(cart.updateItem(req.user.id, Number(req.params.id), req.body));
export const remove = (req, res) => res.json(cart.removeItem(req.user.id, Number(req.params.id)));
export const sync = (req, res) => res.json(cart.syncGuestItems(req.user.id, req.body.items));

// Carrinho de visitante: o cliente envia apenas variação + quantidade; preços vêm do banco.
export function resolve(req, res) {
  res.json(cart.summarize(cart.resolveItems(req.body.items.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity })))));
}

export function quoteShipping(req, res) {
  const subtotal = Number(req.query.subtotal) || 0;
  const zip = String(req.query.zip || '').replace(/\D/g, '');
  if (zip && zip.length !== 8) throw new HttpError(400, 'CEP inválido.');
  res.json({ shipping: shippingFor(subtotal) });
}
