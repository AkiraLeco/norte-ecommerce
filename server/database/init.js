import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import db from './database.js';
import { config } from '../config/env.js';

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  phone TEXT,
  cpf TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS colors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  hex TEXT NOT NULL CHECK (hex GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]')
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  brand TEXT,
  gender TEXT NOT NULL DEFAULT 'unissex' CHECK (gender IN ('masculino','feminino','unissex')),
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  sale_price INTEGER CHECK (sale_price IS NULL OR (sale_price >= 0 AND sale_price < price)),
  fabric TEXT,
  care TEXT,
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0,1)),
  is_new INTEGER NOT NULL DEFAULT 0 CHECK (is_new IN (0,1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  views INTEGER NOT NULL DEFAULT 0,
  sales_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active, featured, is_new);
CREATE INDEX IF NOT EXISTS idx_products_gender ON products(gender);

CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_id INTEGER REFERENCES colors(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id, sort_order);

CREATE TABLE IF NOT EXISTS product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_id INTEGER NOT NULL REFERENCES sizes(id) ON DELETE RESTRICT,
  color_id INTEGER NOT NULL REFERENCES colors(id) ON DELETE RESTRICT,
  sku TEXT UNIQUE,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  UNIQUE (product_id, size_id, color_id)
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id INTEGER NOT NULL UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS carts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  UNIQUE (cart_id, variant_id)
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT,
  recipient TEXT NOT NULL,
  zip TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  district TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0,1))
);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  type TEXT NOT NULL CHECK (type IN ('percent','fixed')),
  value INTEGER NOT NULL CHECK (value > 0),
  min_purchase INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'aguardando_pagamento'
    CHECK (status IN ('aguardando_pagamento','pagamento_confirmado','em_preparacao','enviado','entregue','cancelado')),
  payment_method TEXT NOT NULL,
  subtotal INTEGER NOT NULL,
  discount INTEGER NOT NULL DEFAULT 0,
  shipping INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  coupon_id INTEGER REFERENCES coupons(id) ON DELETE SET NULL,
  coupon_code TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_cpf TEXT,
  ship_zip TEXT NOT NULL,
  ship_street TEXT NOT NULL,
  ship_number TEXT NOT NULL,
  ship_complement TEXT,
  ship_district TEXT NOT NULL,
  ship_city TEXT NOT NULL,
  ship_state TEXT NOT NULL,
  tracking_code TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  size TEXT,
  color TEXT,
  image TEXT,
  unit_price INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

CREATE TABLE IF NOT EXISTS order_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slot TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  cta_label TEXT,
  link TEXT,
  image TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);

CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;

export const DEFAULT_SETTINGS = {
  store_name: 'NORTE',
  store_description: 'Moda contemporânea com identidade. Peças atemporais, cortes precisos e tecidos de qualidade.',
  logo: '',
  phone: '(11) 4000-1234',
  whatsapp: '5511940001234',
  email: 'contato@norte.com.br',
  address: 'Rua Oscar Freire, 1200 — Jardins, São Paulo/SP',
  instagram: 'https://instagram.com/',
  facebook: 'https://facebook.com/',
  tiktok: 'https://tiktok.com/',
  shipping_flat: '2490',
  shipping_free_min: '39900',
  shipping_days: '3 a 7 dias úteis',
  installments_max: '6',
  about: 'A NORTE nasceu para vestir quem sabe quem é. Trabalhamos com modelagens atuais, produção responsável e acabamento cuidadoso.',
  policy_exchange: 'Trocas e devoluções em até 30 dias corridos após o recebimento, com a peça sem uso e com etiqueta.',
  payment_methods: JSON.stringify([
    { id: 'pix_manual', label: 'Pix (confirmação manual)', description: 'Enviamos a chave Pix por e-mail e confirmamos o pagamento manualmente.', enabled: true },
    { id: 'transferencia', label: 'Transferência bancária', description: 'Dados bancários enviados após o pedido. Confirmação manual em até 1 dia útil.', enabled: true },
    { id: 'pagamento_retirada', label: 'Pagar na retirada', description: 'Pague na loja física ao retirar o pedido.', enabled: false },
  ]),
};

const DEFAULT_SIZES = ['PP', 'P', 'M', 'G', 'GG', '36', '38', '40', '42', '44', 'Único'];
const DEFAULT_COLORS = [
  ['Preto', '#111111'], ['Branco', '#F5F5F2'], ['Off-white', '#E9E4D8'], ['Cinza', '#8A8A8A'],
  ['Grafite', '#3A3A3C'], ['Azul-marinho', '#1F2A44'], ['Azul', '#3B5B92'], ['Verde-oliva', '#5B6340'],
  ['Bege', '#C9B79C'], ['Caramelo', '#A9743F'], ['Vinho', '#6D1F2E'], ['Terracota', '#B5654A'],
];

export function initDatabase() {
  db.exec(SCHEMA);

  const putSetting = db.prepare('INSERT OR IGNORE INTO store_settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) putSetting.run(k, v);

  if (!db.prepare('SELECT 1 FROM sizes LIMIT 1').get()) {
    const ins = db.prepare('INSERT INTO sizes (name, sort_order) VALUES (?, ?)');
    DEFAULT_SIZES.forEach((n, i) => ins.run(n, i));
  }
  if (!db.prepare('SELECT 1 FROM colors LIMIT 1').get()) {
    const ins = db.prepare('INSERT INTO colors (name, hex) VALUES (?, ?)');
    DEFAULT_COLORS.forEach(([n, h]) => ins.run(n, h));
  }

  if (!db.prepare("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1").get()) {
    const { name, email, password } = config.admin;
    db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')")
      .run(name, email, bcrypt.hashSync(password, 10));
    console.log(`[db] Administrador inicial criado: ${email}`);
  }
}

// Execução direta: npm run db:init
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  initDatabase();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  console.log(`[db] Banco pronto em ${config.dbPath}`);
  console.log(`[db] Tabelas: ${tables.map((t) => t.name).join(', ')}`);
}
