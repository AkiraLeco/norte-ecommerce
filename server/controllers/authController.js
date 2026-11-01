import bcrypt from 'bcryptjs';
import db from '../database/database.js';
import { signToken } from '../middlewares/auth.js';
import { HttpError, onlyDigits } from '../utils/helpers.js';
import { syncGuestItems } from '../models/cartModel.js';

const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, cpf: u.cpf, role: u.role, created_at: u.created_at });

export function register(req, res) {
  const { name, email, password, phone, cpf, guest_items } = req.body;
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new HttpError(409, 'Este e-mail já está cadastrado.');
  const id = db.prepare('INSERT INTO users (name, email, password_hash, phone, cpf) VALUES (?, ?, ?, ?, ?)')
    .run(name, email, bcrypt.hashSync(password, 10), phone ? onlyDigits(phone) : null, cpf ? onlyDigits(cpf) : null).lastInsertRowid;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (guest_items?.length) syncGuestItems(user.id, guest_items);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}

export function login(req, res) {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email);
  const ok = bcrypt.compareSync(password, user?.password_hash || DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, 'E-mail ou senha incorretos.');
  res.json({ token: signToken(user), user: publicUser(user) });
}

export const me = (req, res) => res.json({ user: publicUser(req.user) });

export function updateProfile(req, res) {
  const { name, phone, cpf } = req.body;
  db.prepare('UPDATE users SET name = ?, phone = ?, cpf = ? WHERE id = ?')
    .run(name, phone ? onlyDigits(phone) : null, cpf ? onlyDigits(cpf) : null, req.user.id);
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
}

export function changePassword(req, res) {
  const { current_password, new_password } = req.body;
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, row.password_hash)) throw new HttpError(400, 'Senha atual incorreta.');
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(new_password, 10), req.user.id);
  res.json({ ok: true });
}

/* ---------- Endereços ---------- */
export const listAddresses = (req, res) =>
  res.json({ items: db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC').all(req.user.id).map((a) => ({ ...a, is_default: !!a.is_default })) });

function saveAddress(userId, id, a) {
  return db.transaction(() => {
    const hasAny = db.prepare('SELECT 1 FROM addresses WHERE user_id = ?').get(userId);
    const makeDefault = a.is_default || !hasAny;
    if (makeDefault) db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(userId);
    const vals = [a.label, a.recipient, a.zip, a.street, a.number, a.complement, a.district, a.city, a.state.toUpperCase(), makeDefault ? 1 : 0];
    if (id) {
      const r = db.prepare(`UPDATE addresses SET label=?, recipient=?, zip=?, street=?, number=?, complement=?, district=?, city=?, state=?, is_default=?
        WHERE id = ? AND user_id = ?`).run(...vals, id, userId);
      if (!r.changes) throw new HttpError(404, 'Endereço não encontrado.');
      return id;
    }
    return Number(db.prepare(`INSERT INTO addresses (label, recipient, zip, street, number, complement, district, city, state, is_default, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(...vals, userId).lastInsertRowid);
  })();
}

export function createAddress(req, res) {
  const id = saveAddress(req.user.id, null, req.body);
  res.status(201).json({ item: db.prepare('SELECT * FROM addresses WHERE id = ?').get(id) });
}

export function updateAddress(req, res) {
  const id = Number(req.params.id);
  saveAddress(req.user.id, id, req.body);
  res.json({ item: db.prepare('SELECT * FROM addresses WHERE id = ?').get(id) });
}

export function deleteAddress(req, res) {
  const r = db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  if (!r.changes) throw new HttpError(404, 'Endereço não encontrado.');
  res.json({ ok: true });
}
