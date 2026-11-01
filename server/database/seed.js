import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from './database.js';
import { initDatabase } from './init.js';
import { backupDatabase } from './backup.js';
import { productImage, categoryImage, bannerImage } from './artwork.js';
import { config } from '../config/env.js';
import { slugify } from '../utils/helpers.js';

const CATEGORIES = [
  { name: 'Básicos', description: 'Peças essenciais para o dia a dia.', type: 'tshirt', color: '#E9E4D8', bg: ['#2B2B2B', '#141414'] },
  { name: 'Streetwear', description: 'Volume, utilidade e atitude urbana.', type: 'hoodie', color: '#3A3A3C', bg: ['#E4DED2', '#C9BFAE'] },
  { name: 'Casual', description: 'Conforto com acabamento refinado.', type: 'shirt', color: '#3B5B92', bg: ['#EFEDE8', '#D8D4CA'] },
  { name: 'Alfaiataria', description: 'Cortes precisos e tecidos nobres.', type: 'jacket', color: '#111111', bg: ['#D9CDBB', '#B9AA92'] },
  { name: 'Acessórios', description: 'Detalhes que completam o look.', type: 'bag', color: '#A9743F', bg: ['#2B2B2B', '#141414'] },
];

const SIZES_TOP = ['PP', 'P', 'M', 'G', 'GG'];
const SIZES_BOTTOM = ['38', '40', '42', '44'];
const SIZES_FEM_BOTTOM = ['36', '38', '40', '42'];
const ONE = ['Único'];

// [nome, gênero, categoria, tipo, preço, promo, cores, tamanhos, tecido, flags]
const PRODUCTS = [
  ['Camiseta Essencial Pima', 'masculino', 'Básicos', 'tshirt', 12900, null, ['Preto', 'Branco', 'Off-white'], SIZES_TOP, '100% algodão pima, 180 g/m²', { featured: 1 }],
  ['Camiseta Oversized Heavy', 'masculino', 'Streetwear', 'tshirt', 15900, 12900, ['Preto', 'Cinza', 'Bege'], SIZES_TOP, '100% algodão, 240 g/m², pré-encolhido', { featured: 1, is_new: 1 }],
  ['Moletom Canguru Utility', 'unissex', 'Streetwear', 'hoodie', 29900, null, ['Grafite', 'Verde-oliva', 'Preto'], SIZES_TOP, '80% algodão, 20% poliéster, felpado', { featured: 1, is_new: 1 }],
  ['Calça Cargo Tática', 'masculino', 'Streetwear', 'pants', 32900, 26900, ['Preto', 'Verde-oliva', 'Bege'], SIZES_BOTTOM, 'Sarja de algodão com elastano', {}],
  ['Calça Alfaiataria Slim', 'masculino', 'Alfaiataria', 'pants', 36900, null, ['Grafite', 'Azul-marinho'], SIZES_BOTTOM, 'Viscose e poliéster com toque de lã', { featured: 1 }],
  ['Camisa Linho Mescla', 'masculino', 'Casual', 'shirt', 24900, 19900, ['Branco', 'Azul', 'Bege'], SIZES_TOP, '55% linho, 45% algodão', {}],
  ['Jaqueta Corta-vento Urban', 'masculino', 'Streetwear', 'jacket', 39900, null, ['Preto', 'Azul-marinho'], SIZES_TOP, 'Nylon ripstop repelente à água', { is_new: 1 }],
  ['Jaqueta Sarja Trucker', 'unissex', 'Casual', 'jacket', 34900, null, ['Caramelo', 'Azul'], SIZES_TOP, 'Sarja pesada 100% algodão', {}],
  ['Vestido Midi Fluido', 'feminino', 'Casual', 'dress', 27900, 21900, ['Preto', 'Terracota', 'Vinho'], SIZES_TOP, 'Viscose fluida com forro', { featured: 1 }],
  ['Vestido Slip Cetim', 'feminino', 'Alfaiataria', 'dress', 31900, null, ['Vinho', 'Preto', 'Off-white'], SIZES_TOP, 'Cetim de poliéster com elastano', { is_new: 1 }],
  ['Camiseta Baby Look Canelada', 'feminino', 'Básicos', 'tshirt', 8900, null, ['Branco', 'Preto', 'Bege'], SIZES_TOP, 'Algodão canelado com elastano', {}],
  ['Calça Pantalona Alfaiataria', 'feminino', 'Alfaiataria', 'pants', 34900, null, ['Preto', 'Bege', 'Caramelo'], SIZES_FEM_BOTTOM, 'Crepe de alfaiataria com caimento fluido', { featured: 1 }],
  ['Blazer Estruturado', 'feminino', 'Alfaiataria', 'jacket', 49900, 39900, ['Preto', 'Off-white'], SIZES_TOP, 'Crepe encorpado com forro em acetato', { is_new: 1 }],
  ['Moletom Cropped Essential', 'feminino', 'Básicos', 'hoodie', 24900, null, ['Cinza', 'Vinho', 'Off-white'], SIZES_TOP, 'Moletom flanelado 100% algodão', {}],
  ['Boné Dad Hat Bordado', 'unissex', 'Acessórios', 'cap', 8900, null, ['Preto', 'Bege', 'Azul-marinho'], ONE, 'Sarja de algodão com fecho metálico', {}],
  ['Bolsa Tote Couro Eco', 'feminino', 'Acessórios', 'bag', 21900, 17900, ['Caramelo', 'Preto'], ONE, 'Couro ecológico com forro em algodão', { featured: 1 }],
  ['Tênis Court Minimal', 'unissex', 'Streetwear', 'sneaker', 44900, null, ['Branco', 'Preto'], ['38', '40', '42', '44'], 'Cabedal em couro sintético, solado de borracha', { is_new: 1 }],
  ['Mochila Urbana 22L', 'unissex', 'Acessórios', 'bag', 25900, null, ['Preto', 'Grafite'], ONE, 'Poliéster 600D com acabamento impermeável', {}],
];

const CARE = 'Lavar à mão ou à máquina em ciclo delicado, até 30 °C. Não usar alvejante. Passar em temperatura baixa. Secar à sombra.';

const DESCRIPTIONS = {
  tshirt: 'Modelagem atual, gola reforçada e acabamento limpo. Uma base versátil para compor qualquer look.',
  shirt: 'Camisa de caimento leve, com costuras reforçadas e botões com acabamento fosco.',
  hoodie: 'Moletom macio por dentro, com capuz estruturado e bolso frontal. Pensado para o conforto sem perder o estilo.',
  jacket: 'Peça de camada com corte preciso, bolsos funcionais e acabamento de alto padrão.',
  pants: 'Cintura confortável e corte pensado para valorizar a silhueta, do trabalho ao fim de semana.',
  dress: 'Caimento elegante e movimento leve. Funciona do dia à noite com mudanças simples de acessórios.',
  cap: 'Aba curva, regulagem metálica e bordado discreto da marca.',
  bag: 'Compartimento amplo, acabamento reforçado e design minimalista.',
  sneaker: 'Design limpo e atemporal, palmilha macia e solado com boa aderência.',
};

// Pseudo-aleatório determinístico para o estoque/volumes ficarem iguais a cada restauração.
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

function writeSvg(folder, name, svg) {
  const dir = path.join(config.uploadsDir, folder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), svg);
  return `/uploads/${folder}/${name}`;
}

function wipeCatalog() {
  const tables = ['order_history', 'order_items', 'orders', 'cart_items', 'carts', 'favorites', 'addresses', 'product_images',
    'inventory', 'product_variants', 'products', 'categories', 'coupons', 'banners'];
  db.transaction(() => {
    for (const t of tables) db.exec(`DELETE FROM ${t}`);
    db.exec("DELETE FROM users WHERE role = 'customer'");
    db.exec("UPDATE store_settings SET value = '' WHERE key = 'logo'");
  })();
  for (const folder of ['products', 'categories', 'banners']) {
    const dir = path.join(config.uploadsDir, folder);
    if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) fs.rmSync(path.join(dir, f), { force: true });
  }
}

export async function seedDemo({ reset = false } = {}) {
  initDatabase();
  if (reset) {
    const file = await backupDatabase('antes-restaurar-demo');
    console.log(`[seed] Backup de segurança criado: ${file}`);
    wipeCatalog();
  } else if (db.prepare('SELECT 1 FROM products LIMIT 1').get()) {
    console.log('[seed] O catálogo já possui produtos. Use "npm run db:restore-demo" para restaurar os dados demonstrativos.');
    return;
  }

  const rand = rng(42);
  const sizeId = Object.fromEntries(db.prepare('SELECT id, name FROM sizes').all().map((s) => [s.name, s.id]));
  const colors = Object.fromEntries(db.prepare('SELECT id, name, hex FROM colors').all().map((c) => [c.name, c]));

  db.transaction(() => {
    /* Categorias */
    const catId = {};
    CATEGORIES.forEach((c, i) => {
      const slug = slugify(c.name);
      const image = writeSvg('categories', `${slug}.svg`, categoryImage(c));
      catId[c.name] = Number(db.prepare('INSERT INTO categories (name, slug, description, image, sort_order) VALUES (?, ?, ?, ?, ?)')
        .run(c.name, slug, c.description, image, i).lastInsertRowid);
    });

    /* Produtos */
    const insProduct = db.prepare(`INSERT INTO products (name, slug, description, brand, gender, category_id, price, sale_price, fabric, care,
      featured, is_new, views, sales_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`);
    const insVariant = db.prepare('INSERT INTO product_variants (product_id, size_id, color_id, sku) VALUES (?, ?, ?, ?)');
    const insInv = db.prepare('INSERT INTO inventory (variant_id, quantity, low_stock_threshold) VALUES (?, ?, 5)');
    const insImg = db.prepare('INSERT INTO product_images (product_id, color_id, path, sort_order) VALUES (?, ?, ?, ?)');

    PRODUCTS.forEach(([name, gender, cat, type, price, sale, colorNames, sizes, fabric, flags], idx) => {
      const slug = slugify(name);
      const pid = Number(insProduct.run(
        name, slug, DESCRIPTIONS[type], idx % 5 === 4 ? 'NORTE Studio' : 'NORTE', gender, catId[cat], price, sale, fabric, CARE,
        flags.featured ? 1 : 0, flags.is_new ? 1 : 0, Math.floor(rand() * 900) + 40, Math.floor(rand() * 120), `-${idx * 2 + 1} days`,
      ).lastInsertRowid);

      let order = 0;
      colorNames.forEach((cn, ci) => {
        const col = colors[cn];
        for (const sn of sizes) {
          const v = Number(insVariant.run(pid, sizeId[sn], col.id, `${slug}-${slugify(cn)}-${sn}`.toUpperCase().slice(0, 60)).lastInsertRowid);
          const roll = rand();
          // alguns itens esgotados e outros com estoque baixo para demonstrar os alertas
          const qty = roll < 0.07 ? 0 : roll < 0.2 ? Math.floor(rand() * 4) + 1 : Math.floor(rand() * 18) + 6;
          insInv.run(v, qty);
        }
        ['main', 'detail', 'alt'].forEach((variant) => {
          const svg = productImage({ type, color: col.hex, variant });
          insImg.run(pid, col.id, writeSvg('products', `${slug}-${slugify(cn)}-${variant}.svg`, svg), order++);
        });
        void ci;
      });
    });

    /* Cupons */
    const insCoupon = db.prepare('INSERT INTO coupons (code, type, value, min_purchase, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?)');
    insCoupon.run('BEMVINDO10', 'percent', 10, 0, null, null);
    insCoupon.run('NORTE50', 'fixed', 5000, 30000, 200, null);
    insCoupon.run('VERAO20', 'percent', 20, 20000, 100, '2030-12-31');
    insCoupon.run('EXPIRADO', 'percent', 15, 0, null, '2020-01-01');

    /* Banners */
    const insBanner = db.prepare('INSERT INTO banners (slot, title, subtitle, cta_label, link, image, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const heroImg = writeSvg('banners', 'hero.svg', bannerImage({
      bg: ['#1b1b1b', '#0b0b0b'], caption: 'NORTE — COLEÇÃO 26',
      pieces: [
        { type: 'jacket', color: '#3A3A3C', x: 1010, y: 470, scale: 1.25, rotate: -4 },
        { type: 'dress', color: '#6D1F2E', x: 1330, y: 520, scale: 1.05, rotate: 5 },
        { type: 'hoodie', color: '#C9B79C', x: 700, y: 560, scale: 0.8, rotate: -8 },
      ],
    }));
    insBanner.run('hero', 'VISTA SUA IDENTIDADE.', 'Estilo, autenticidade e qualidade em cada detalhe.', 'EXPLORAR COLEÇÃO', '/catalogo', heroImg, 0);

    const promos = [
      ['Nova coleção', 'Outono/Inverno 26: camadas, texturas e tons profundos.', 'Ver coleção', '/catalogo?novidades=1', { bg: ['#2B2B2B', '#111'], pieces: [{ type: 'jacket', color: '#C9B79C', x: 1100, y: 460, scale: 1.1, rotate: -5 }, { type: 'pants', color: '#111111', x: 1400, y: 470, scale: 0.9, rotate: 6 }] }],
      ['Promoções especiais', 'Peças selecionadas com até 25% de desconto.', 'Aproveitar', '/catalogo?promocoes=1', { bg: ['#6D1F2E', '#2B0B12'], pieces: [{ type: 'dress', color: '#F5F5F2', x: 1150, y: 470, scale: 1.1, rotate: 4 }] }],
      ['Ofertas da semana', 'Use BEMVINDO10 e ganhe 10% na primeira compra.', 'Comprar agora', '/catalogo?promocoes=1', { bg: ['#B89B72', '#7C6642'], pieces: [{ type: 'tshirt', color: '#111111', x: 1150, y: 470, scale: 1.1, rotate: -4 }] }],
      ['Coleção exclusiva', 'Alfaiataria atemporal, em edição limitada.', 'Descobrir', '/catalogo?categoria=alfaiataria', { bg: ['#E4DED2', '#C9BFAE'], pieces: [{ type: 'jacket', color: '#111111', x: 1150, y: 470, scale: 1.1, rotate: 3 }] }],
    ];
    promos.forEach(([title, sub, cta, link, art], i) => {
      insBanner.run('promo', title, sub, cta, link, writeSvg('banners', `promo-${i + 1}.svg`, bannerImage({ width: 1600, height: 700, ...art })), i);
    });

    const cards = [
      ['Masculino', '/catalogo?genero=masculino', 'shirt', '#3A3A3C', ['#E4DED2', '#C9BFAE']],
      ['Feminino', '/catalogo?genero=feminino', 'dress', '#6D1F2E', ['#EFEDE8', '#D8D4CA']],
      ['Streetwear', '/catalogo?categoria=streetwear', 'hoodie', '#5B6340', ['#2B2B2B', '#111111']],
      ['Casual', '/catalogo?categoria=casual', 'tshirt', '#E9E4D8', ['#3B5B92', '#1F2A44']],
      ['Acessórios', '/catalogo?categoria=acessorios', 'bag', '#A9743F', ['#EFEDE8', '#D8D4CA']],
      ['Lançamentos', '/catalogo?novidades=1', 'jacket', '#111111', ['#D9CDBB', '#B9AA92']],
    ];
    cards.forEach(([title, link, type, color, bg], i) => {
      insBanner.run('category', title, null, null, link, writeSvg('banners', `card-${slugify(title)}.svg`, categoryImage({ type, color, bg })), i);
    });

    /* Clientes e pedidos de demonstração */
    const insUser = db.prepare('INSERT INTO users (name, email, password_hash, phone, cpf) VALUES (?, ?, ?, ?, ?)');
    const pwd = bcrypt.hashSync('cliente123', 10);
    const customers = [
      ['Marina Alves', 'cliente@loja.com', '11987654321', '52998224725'],
      ['Rafael Souza', 'rafael@exemplo.com', '21977771234', '11144477735'],
      ['Beatriz Lima', 'beatriz@exemplo.com', '31966662345', '39053344705'],
    ].map(([n, e, p, c]) => ({ id: Number(insUser.run(n, e, pwd, p, c).lastInsertRowid), name: n, email: e, phone: p, cpf: c }));

    db.prepare(`INSERT INTO addresses (user_id, label, recipient, zip, street, number, complement, district, city, state, is_default)
      VALUES (?, 'Casa', ?, '01310100', 'Avenida Paulista', '1578', 'Apto 42', 'Bela Vista', 'São Paulo', 'SP', 1)`).run(customers[0].id, customers[0].name);

    const variants = db.prepare(`
      SELECT v.id, v.product_id, p.name, p.price, p.sale_price, s.name AS size, c.name AS color,
        (SELECT path FROM product_images pi WHERE pi.product_id = p.id AND pi.color_id = v.color_id ORDER BY sort_order LIMIT 1) AS image
      FROM product_variants v JOIN products p ON p.id = v.product_id JOIN sizes s ON s.id = v.size_id JOIN colors c ON c.id = v.color_id`).all();
    const insOrder = db.prepare(`INSERT INTO orders (number, user_id, status, payment_method, subtotal, discount, shipping, total,
      customer_name, customer_email, customer_phone, customer_cpf, ship_zip, ship_street, ship_number, ship_district, ship_city, ship_state, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, '01310100', 'Avenida Paulista', '1578', 'Bela Vista', 'São Paulo', 'SP', datetime('now', ?))`);
    const insItem = db.prepare('INSERT INTO order_items (order_id, product_id, variant_id, name, size, color, image, unit_price, quantity, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insHist = db.prepare('INSERT INTO order_history (order_id, status, note) VALUES (?, ?, ?)');
    const statuses = ['entregue', 'entregue', 'enviado', 'em_preparacao', 'pagamento_confirmado', 'aguardando_pagamento', 'cancelado', 'entregue', 'aguardando_pagamento', 'enviado', 'entregue', 'pagamento_confirmado'];

    statuses.forEach((status, i) => {
      const cust = customers[i % customers.length];
      const picks = Array.from({ length: 1 + Math.floor(rand() * 3) }, () => variants[Math.floor(rand() * variants.length)]);
      const lines = picks.map((v) => ({ v, qty: 1 + Math.floor(rand() * 2), unit: v.sale_price ?? v.price }));
      const subtotal = lines.reduce((n, l) => n + l.unit * l.qty, 0);
      const shipping = subtotal >= 39900 ? 0 : 2490;
      const number = `NRT-DEMO-${String(i + 1).padStart(6, '0')}`;
      const id = Number(insOrder.run(number, cust.id, status, i % 2 ? 'transferencia' : 'pix_manual', subtotal, shipping, subtotal + shipping,
        cust.name, cust.email, cust.phone, cust.cpf, `-${Math.min(13, i + Math.floor(rand() * 2))} days`).lastInsertRowid);
      lines.forEach((l) => insItem.run(id, l.v.product_id, l.v.id, l.v.name, l.v.size, l.v.color, l.v.image, l.unit, l.qty, l.unit * l.qty));
      insHist.run(id, 'aguardando_pagamento', 'Pedido realizado.');
      if (status !== 'aguardando_pagamento') insHist.run(id, status, null);
    });
  })();

  const n = db.prepare('SELECT COUNT(*) n FROM products').get().n;
  console.log(`[seed] Dados demonstrativos inseridos (${n} produtos). Cliente demo: cliente@loja.com / cliente123`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await seedDemo({ reset: process.argv.includes('--reset') });
}
