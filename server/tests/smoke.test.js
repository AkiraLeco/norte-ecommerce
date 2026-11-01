// Teste de fumaça de ponta a ponta contra um banco SQLite temporário (não toca em loja.db).
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import http from 'node:http';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'loja-test-'));
process.env.DB_PATH = path.join(tmp, 'test.db');
process.env.NODE_TEST = '1';
process.env.AUTO_SEED = 'true';

const { app } = await import('../server.js');
const { default: db } = await import('../database/database.js');

const server = http.createServer(app).listen(0);
const base = `http://127.0.0.1:${server.address().port}/api`;

let passed = 0;
async function api(method, url, { body, token, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(base + url, { method, headers, body: form ?? (body ? JSON.stringify(body) : undefined) });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}
async function step(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); } catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); process.exitCode = 1; }
}

console.log('\nSmoke test da loja\n');

await step('1. Conexão SQLite e tabelas criadas', () => {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((t) => t.name);
  for (const t of ['users', 'products', 'categories', 'product_images', 'product_variants', 'sizes', 'colors', 'inventory', 'carts',
    'cart_items', 'orders', 'order_items', 'addresses', 'coupons', 'store_settings']) assert.ok(tables.includes(t), `tabela ${t}`);
  assert.equal(db.pragma('foreign_keys', { simple: true }), 1);
  assert.equal(db.pragma('journal_mode', { simple: true }), 'wal');
});

let adminToken, userToken, product;

await step('2. Cadastro, login e /auth/me', async () => {
  const email = `teste${Date.now()}@exemplo.com`;
  let r = await api('POST', '/auth/register', { body: { name: 'Cliente Teste', email, password: 'senha-forte-1' } });
  assert.equal(r.status, 201);
  userToken = r.data.token;
  r = await api('POST', '/auth/register', { body: { name: 'Duplicado', email, password: 'senha-forte-1' } });
  assert.equal(r.status, 409);
  r = await api('POST', '/auth/login', { body: { email, password: 'errada' } });
  assert.equal(r.status, 401);
  r = await api('POST', '/auth/login', { body: { email: 'admin@loja.com', password: 'admin123' } });
  assert.equal(r.status, 200);
  adminToken = r.data.token;
  r = await api('GET', '/auth/me', { token: userToken });
  assert.equal(r.data.user.email, email);
  assert.ok(!('password_hash' in r.data.user));
});

await step('3. Autorização: cliente não acessa rotas administrativas', async () => {
  assert.equal((await api('GET', '/admin/dashboard')).status, 401);
  assert.equal((await api('GET', '/admin/dashboard', { token: userToken })).status, 403);
  assert.equal((await api('POST', '/products', { token: userToken, body: {} })).status, 403);
});

await step('4. Catálogo carrega do SQLite com filtros e paginação', async () => {
  let r = await api('GET', '/products?limit=5');
  assert.ok(r.data.total >= 18 && r.data.items.length === 5 && r.data.pages > 1);
  r = await api('GET', '/products?gender=feminino&promo=1');
  assert.ok(r.data.items.length > 0 && r.data.items.every((p) => p.on_sale));
  r = await api('GET', '/products?q=%27%3B%20DROP%20TABLE%20products%3B--');
  assert.equal(r.status, 200);
  assert.ok(db.prepare('SELECT COUNT(*) n FROM products').get().n >= 18, 'SQL injection não afetou a tabela');
});

await step('5. CRUD de produtos + validações', async () => {
  const size = db.prepare('SELECT id FROM sizes WHERE name = ?').get('M').id;
  const color = db.prepare('SELECT id FROM colors WHERE name = ?').get('Preto').id;
  let r = await api('POST', '/products', { token: adminToken, body: { name: 'Produto Teste', price: 10000, sale_price: 12000, variants: [] } });
  assert.equal(r.status, 400); // promo >= preço
  r = await api('POST', '/products', { token: adminToken, body: { name: 'Produto Teste', price: 10000, sale_price: 8000, gender: 'unissex', variants: [{ size_id: size, color_id: color, quantity: 3 }] } });
  assert.equal(r.status, 201);
  product = r.data.item;
  assert.equal(product.discount_percent, 20);
  r = await api('PUT', `/products/${product.id}`, { token: adminToken, body: { name: 'Produto Teste Editado', price: 11000, variants: [{ size_id: size, color_id: color, quantity: 5 }] } });
  assert.equal(r.data.item.price, 11000);
  assert.equal(r.data.item.variants[0].stock, 5);
});

await step('6. Upload de imagens (validação de formato e persistência)', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  let form = new FormData();
  form.append('images', new Blob([png], { type: 'image/png' }), 'a.png');
  let r = await api('POST', `/products/${product.id}/images`, { token: adminToken, form });
  assert.equal(r.status, 201);
  const file = path.join(process.cwd(), r.data.images[0].path.replace(/^\//, ''));
  assert.ok(fs.existsSync(file) || fs.existsSync(path.join(process.cwd(), 'server', r.data.images[0].path.replace(/^\//, ''))));
  form = new FormData();
  form.append('images', new Blob(['<?php ?>'], { type: 'text/plain' }), 'x.php');
  r = await api('POST', `/products/${product.id}/images`, { token: adminToken, form });
  assert.equal(r.status, 400);
  r = await api('DELETE', `/products/${product.id}/images/${r.data.images?.[0]?.id ?? 0}`, { token: adminToken });
});

await step('7. Carrinho: adicionar, validar estoque, alterar, remover', async () => {
  const detail = (await api('GET', `/products/${product.id}`)).data.item;
  const variantId = detail.variants[0].id;
  let r = await api('POST', '/cart/items', { token: userToken, body: { variant_id: variantId, quantity: 2 } });
  assert.equal(r.status, 201);
  assert.equal(r.data.subtotal, 11000 * 2);
  r = await api('POST', '/cart/items', { token: userToken, body: { variant_id: variantId, quantity: 10 } });
  assert.equal(r.status, 409); // estoque insuficiente
  const itemId = (await api('GET', '/cart', { token: userToken })).data.items[0].id;
  r = await api('PUT', `/cart/items/${itemId}`, { token: userToken, body: { quantity: 3 } });
  assert.equal(r.data.count, 3);
  r = await api('DELETE', `/cart/items/${itemId}`, { token: userToken });
  assert.equal(r.data.count, 0);
  r = await api('POST', '/cart/resolve', { body: { items: [{ variant_id: variantId, quantity: 1 }] } });
  assert.equal(r.data.subtotal, 11000);
});

await step('8. Cupons', async () => {
  let r = await api('POST', '/coupons/validate', { body: { code: 'bemvindo10', subtotal: 20000 } });
  assert.equal(r.data.discount, 2000);
  r = await api('POST', '/coupons/validate', { body: { code: 'NORTE50', subtotal: 1000 } });
  assert.equal(r.status, 400); // abaixo do mínimo
  r = await api('POST', '/coupons/validate', { body: { code: 'EXPIRADO', subtotal: 20000 } });
  assert.equal(r.status, 400);
});

await step('9. Checkout transacional: preço no servidor, estoque e cupom', async () => {
  const detail = (await api('GET', `/products/${product.id}`)).data.item;
  const variantId = detail.variants[0].id;
  await api('POST', '/cart/items', { token: userToken, body: { variant_id: variantId, quantity: 2 } });
  const payload = {
    customer_name: 'Cliente Teste', customer_email: 'c@exemplo.com', customer_phone: '(11) 98765-4321', customer_cpf: '529.982.247-25',
    shipping_address: { zip: '01310-100', street: 'Av. Paulista', number: '1000', district: 'Bela Vista', city: 'São Paulo', state: 'SP' },
    payment_method: 'pix_manual', coupon_code: 'BEMVINDO10',
  };
  let r = await api('POST', '/orders', { token: userToken, body: { ...payload, customer_cpf: '111.111.111-11' } });
  assert.equal(r.status, 400);
  r = await api('POST', '/orders', { token: userToken, body: { ...payload, payment_method: 'cartao_falso' } });
  assert.equal(r.status, 400);
  r = await api('POST', '/orders', { token: userToken, body: payload });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const o = r.data.item;
  assert.equal(o.subtotal, 22000);
  assert.equal(o.discount, 2200);
  assert.equal(o.shipping, 2490);
  assert.equal(o.total, 22000 - 2200 + 2490);
  assert.equal(o.status, 'aguardando_pagamento');
  assert.match(o.number, /^NRT-\d{8}-\d{6}$/);
  assert.equal(db.prepare('SELECT quantity FROM inventory WHERE variant_id = ?').get(variantId).quantity, 3, 'estoque decrementado');
  assert.equal((await api('GET', '/cart', { token: userToken })).data.count, 0, 'carrinho esvaziado');
  assert.equal((await api('POST', '/orders', { token: userToken, body: payload })).status, 400, 'carrinho vazio');

  // estoque: tentar comprar mais do que existe falha sem alterar nada
  db.prepare('UPDATE inventory SET quantity = 1 WHERE variant_id = ?').run(variantId);
  db.prepare('INSERT OR IGNORE INTO carts (user_id) SELECT id FROM users WHERE role = \'customer\' ORDER BY id DESC LIMIT 1').run();
  const cartId = db.prepare('SELECT c.id FROM carts c ORDER BY c.id DESC LIMIT 1').get().id;
  db.prepare('INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (?, ?, 2)').run(cartId, variantId);
  r = await api('POST', '/orders', { token: userToken, body: payload });
  assert.equal(r.status, 409);
  assert.equal(db.prepare('SELECT quantity FROM inventory WHERE variant_id = ?').get(variantId).quantity, 1, 'rollback preservou o estoque');
  assert.equal(db.prepare('SELECT used_count FROM coupons WHERE code = ?').get('BEMVINDO10').used_count, 1, 'rollback preservou o cupom');
  db.prepare('DELETE FROM cart_items').run();
  db.prepare('UPDATE inventory SET quantity = 3 WHERE variant_id = ?').run(variantId);

  // Cliente só vê os próprios pedidos
  const other = (await api('POST', '/auth/register', { body: { name: 'Outro', email: `o${Date.now()}@exemplo.com`, password: 'senha-forte-1' } })).data.token;
  assert.equal((await api('GET', `/orders/${o.id}`, { token: other })).status, 404);
  assert.equal((await api('GET', `/orders/${o.id}`, { token: userToken })).status, 200);
  assert.equal((await api('PUT', `/orders/${o.id}/status`, { token: userToken, body: { status: 'entregue' } })).status, 403);

  // 7b. Cancelamento devolve estoque e cupom
  r = await api('PUT', `/orders/${o.id}/status`, { token: adminToken, body: { status: 'pagamento_confirmado' } });
  assert.equal(r.data.item.status, 'pagamento_confirmado');
  r = await api('PUT', `/orders/${o.id}/status`, { token: adminToken, body: { status: 'cancelado' } });
  assert.equal(db.prepare('SELECT quantity FROM inventory WHERE variant_id = ?').get(variantId).quantity, 5, 'estoque devolvido');
  assert.equal(db.prepare('SELECT used_count FROM coupons WHERE code = ?').get('BEMVINDO10').used_count, 0, 'cupom devolvido');
  assert.equal((await api('PUT', `/orders/${o.id}/status`, { token: adminToken, body: { status: 'enviado' } })).status, 400);
});

await step('10. Estoque e painel administrativo', async () => {
  let r = await api('GET', '/inventory?low=1', { token: adminToken });
  assert.ok(r.data.items.length > 0);
  r = await api('PUT', `/inventory/${r.data.items[0].id}`, { token: adminToken, body: { quantity: 40 } });
  assert.equal(r.data.item.quantity, 40);
  r = await api('GET', '/admin/dashboard', { token: adminToken });
  assert.ok(r.data.totals.products >= 19 && r.data.salesByDay.length === 14 && r.data.topProducts.length > 0);
  r = await api('POST', '/admin/backup', { token: adminToken });
  assert.equal(r.status, 200);
});

await step('11. Categorias e favoritos', async () => {
  let r = await api('POST', '/categories', { token: adminToken, body: { name: 'Teste Cat' } });
  assert.equal(r.status, 201);
  const id = r.data.item.id;
  assert.equal((await api('DELETE', `/categories/${id}`, { token: adminToken })).status, 200);
  r = await api('POST', '/favorites', { token: userToken, body: { product_id: product.id } });
  assert.equal(r.status, 201);
  assert.deepEqual((await api('GET', '/favorites', { token: userToken })).data.ids, [product.id]);
  await api('DELETE', `/favorites/${product.id}`, { token: userToken });
});

await step('12. Excluir produto', async () => {
  assert.equal((await api('DELETE', `/products/${product.id}`, { token: adminToken })).status, 200);
  assert.equal((await api('GET', `/products/${product.id}`)).status, 404);
});

server.close();
db.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} verificações aprovadas${process.exitCode ? ' — HÁ FALHAS' : ''}\n`);
process.exit(process.exitCode || 0);
