import db from '../database/database.js';
import { DEFAULT_SETTINGS } from '../database/init.js';

export function getAllSettings() {
  const out = {};
  for (const row of db.prepare('SELECT key, value FROM store_settings').all()) out[row.key] = row.value;
  return out;
}

export function getSetting(key) {
  return db.prepare('SELECT value FROM store_settings WHERE key = ?').get(key)?.value ?? DEFAULT_SETTINGS[key] ?? '';
}

export function updateSettings(values) {
  const upsert = db.prepare('INSERT INTO store_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  db.transaction(() => {
    for (const [k, v] of Object.entries(values)) upsert.run(k, String(v ?? ''));
  })();
}

export function paymentMethods({ onlyEnabled = false } = {}) {
  let list = [];
  try {
    list = JSON.parse(getSetting('payment_methods'));
  } catch {
    list = [];
  }
  return onlyEnabled ? list.filter((m) => m.enabled) : list;
}

// Configurações seguras para o público (sem dados internos).
export function publicSettings() {
  const s = getAllSettings();
  return {
    store_name: s.store_name,
    store_description: s.store_description,
    logo: s.logo,
    phone: s.phone,
    whatsapp: s.whatsapp,
    email: s.email,
    address: s.address,
    instagram: s.instagram,
    facebook: s.facebook,
    tiktok: s.tiktok,
    about: s.about,
    policy_exchange: s.policy_exchange,
    shipping_flat: Number(s.shipping_flat) || 0,
    shipping_free_min: Number(s.shipping_free_min) || 0,
    shipping_days: s.shipping_days,
    installments_max: Number(s.installments_max) || 1,
    payment_methods: paymentMethods({ onlyEnabled: true }).map(({ id, label, description }) => ({ id, label, description })),
  };
}

// Frete calculado sempre no servidor: valor fixo, grátis acima do mínimo configurado.
export function shippingFor(subtotal) {
  const flat = Number(getSetting('shipping_flat')) || 0;
  const freeMin = Number(getSetting('shipping_free_min')) || 0;
  if (subtotal <= 0) return 0;
  if (freeMin > 0 && subtotal >= freeMin) return 0;
  return flat;
}
