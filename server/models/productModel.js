import db from '../database/database.js';
import { HttpError, uniqueSlug, slugify } from '../utils/helpers.js';

const EFFECTIVE = 'COALESCE(p.sale_price, p.price)';

const SORTS = {
  recent: 'p.created_at DESC, p.id DESC',
  best: 'p.sales_count DESC, p.id DESC',
  price_asc: `${EFFECTIVE} ASC, p.id DESC`,
  price_desc: `${EFFECTIVE} DESC, p.id DESC`,
  popular: 'p.views DESC, p.id DESC',
};

const inStockVariant = (extra = '') => `EXISTS (
  SELECT 1 FROM product_variants v JOIN inventory i ON i.variant_id = v.id
  WHERE v.product_id = p.id AND v.active = 1 AND i.quantity > 0 ${extra})`;

function decorate(p) {
  const final = p.sale_price ?? p.price;
  return {
    ...p,
    featured: !!p.featured,
    is_new: !!p.is_new,
    active: !!p.active,
    final_price: final,
    on_sale: p.sale_price != null,
    discount_percent: p.sale_price != null ? Math.round((1 - p.sale_price / p.price) * 100) : 0,
  };
}

function attachCardData(rows) {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.id);
  const marks = ids.map(() => '?').join(',');
  const images = db.prepare(`SELECT product_id, color_id, path FROM product_images WHERE product_id IN (${marks}) ORDER BY sort_order, id`).all(...ids);
  const colors = db.prepare(`
    SELECT DISTINCT v.product_id, c.id, c.name, c.hex
    FROM product_variants v JOIN colors c ON c.id = v.color_id
    WHERE v.product_id IN (${marks}) AND v.active = 1 ORDER BY c.id`).all(...ids);

  return rows.map((p) => {
    const imgs = images.filter((i) => i.product_id === p.id);
    const cols = colors.filter((c) => c.product_id === p.id).map((c) => ({
      id: c.id,
      name: c.name,
      hex: c.hex,
      image: imgs.find((i) => i.color_id === c.id)?.path || null,
    }));
    return { ...decorate(p), image: imgs[0]?.path || null, image_hover: imgs[1]?.path || null, colors: cols };
  });
}

export function listProducts(f, { admin = false } = {}) {
  const where = [];
  const params = [];
  if (!admin) where.push('p.active = 1');
  else if (f.active != null) { where.push('p.active = ?'); params.push(f.active ? 1 : 0); }

  if (f.q) {
    where.push('(p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ? OR c.name LIKE ?)');
    const like = `%${f.q}%`;
    params.push(like, like, like, like);
  }
  if (f.category) { where.push('c.slug = ?'); params.push(f.category); }
  if (f.gender) { where.push("p.gender IN (?, 'unissex')"); params.push(f.gender); }
  if (f.brand) { where.push('p.brand = ?'); params.push(f.brand); }
  if (f.size) { where.push(inStockVariant('AND v.size_id = ?')); params.push(f.size); }
  if (f.color) { where.push(inStockVariant('AND v.color_id = ?')); params.push(f.color); }
  if (f.min != null) { where.push(`${EFFECTIVE} >= ?`); params.push(f.min); }
  if (f.max != null) { where.push(`${EFFECTIVE} <= ?`); params.push(f.max); }
  if (f.available) where.push(inStockVariant());
  if (f.promo) where.push('p.sale_price IS NOT NULL');
  if (f.new) where.push('p.is_new = 1');
  if (f.featured) where.push('p.featured = 1');
  if (f.ids?.length) { where.push(`p.id IN (${f.ids.map(() => '?').join(',')})`); params.push(...f.ids); }
  if (f.exclude) { where.push('p.id != ?'); params.push(f.exclude); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const from = `FROM products p LEFT JOIN categories c ON c.id = p.category_id ${whereSql}`;
  const total = db.prepare(`SELECT COUNT(*) n ${from}`).get(...params).n;

  const rows = db.prepare(`
    SELECT p.*, c.name AS category_name, c.slug AS category_slug,
      (SELECT COALESCE(SUM(i.quantity), 0) FROM product_variants v JOIN inventory i ON i.variant_id = v.id
        WHERE v.product_id = p.id AND v.active = 1) AS stock
    ${from} ORDER BY ${SORTS[f.sort] || SORTS.recent} LIMIT ? OFFSET ?`)
    .all(...params, f.limit, (f.page - 1) * f.limit);

  return { items: attachCardData(rows), total, page: f.page, pages: Math.max(1, Math.ceil(total / f.limit)), limit: f.limit };
}

export function filterOptions() {
  const brands = db.prepare("SELECT DISTINCT brand FROM products WHERE active = 1 AND brand IS NOT NULL AND brand != '' ORDER BY brand").all().map((r) => r.brand);
  const sizes = db.prepare(`
    SELECT DISTINCT s.id, s.name, s.sort_order FROM sizes s
    JOIN product_variants v ON v.size_id = s.id JOIN products p ON p.id = v.product_id AND p.active = 1
    ORDER BY s.sort_order`).all();
  const colors = db.prepare(`
    SELECT DISTINCT c.id, c.name, c.hex FROM colors c
    JOIN product_variants v ON v.color_id = c.id JOIN products p ON p.id = v.product_id AND p.active = 1
    ORDER BY c.name`).all();
  const price = db.prepare(`SELECT COALESCE(MIN(${EFFECTIVE}), 0) min, COALESCE(MAX(${EFFECTIVE}), 0) max FROM products p WHERE p.active = 1`).get();
  return { brands, sizes, colors, price };
}

export function getProduct(idOrSlug, { admin = false } = {}) {
  const isId = /^\d+$/.test(String(idOrSlug));
  const row = db.prepare(`
    SELECT p.*, c.name AS category_name, c.slug AS category_slug
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
    WHERE ${isId ? 'p.id' : 'p.slug'} = ? ${admin ? '' : 'AND p.active = 1'}`).get(isId ? Number(idOrSlug) : idOrSlug);
  if (!row) return null;

  const images = db.prepare('SELECT id, color_id, path, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order, id').all(row.id);
  const variants = db.prepare(`
    SELECT v.id, v.sku, v.active, v.size_id, s.name AS size, s.sort_order AS size_order,
           v.color_id, c.name AS color, c.hex, COALESCE(i.quantity, 0) AS stock, COALESCE(i.low_stock_threshold, 5) AS low_stock_threshold
    FROM product_variants v
    JOIN sizes s ON s.id = v.size_id JOIN colors c ON c.id = v.color_id
    LEFT JOIN inventory i ON i.variant_id = v.id
    WHERE v.product_id = ? ${admin ? '' : 'AND v.active = 1'}
    ORDER BY c.id, s.sort_order`).all(row.id);

  const colors = [];
  const sizes = [];
  for (const v of variants) {
    if (!colors.some((c) => c.id === v.color_id)) colors.push({ id: v.color_id, name: v.color, hex: v.hex });
    if (!sizes.some((s) => s.id === v.size_id)) sizes.push({ id: v.size_id, name: v.size, order: v.size_order });
  }
  sizes.sort((a, b) => a.order - b.order);

  return {
    ...decorate(row),
    images,
    variants,
    colors,
    sizes,
    stock: variants.filter((v) => v.active).reduce((n, v) => n + v.stock, 0),
  };
}

export function incrementViews(id) {
  db.prepare('UPDATE products SET views = views + 1 WHERE id = ?').run(id);
}

const skuFor = (productId, sizeName, colorName) =>
  `P${productId}-${slugify(sizeName)}-${slugify(colorName)}`.toUpperCase();

function syncVariants(productId, variants) {
  const sizeName = db.prepare('SELECT name FROM sizes WHERE id = ?');
  const colorName = db.prepare('SELECT name FROM colors WHERE id = ?');
  const existing = db.prepare('SELECT id, size_id, color_id FROM product_variants WHERE product_id = ?').all(productId);
  const keep = new Set();

  const insVariant = db.prepare('INSERT INTO product_variants (product_id, size_id, color_id, sku) VALUES (?, ?, ?, ?)');
  const insInv = db.prepare('INSERT INTO inventory (variant_id, quantity, low_stock_threshold) VALUES (?, ?, ?)');
  const updInv = db.prepare("UPDATE inventory SET quantity = ?, low_stock_threshold = ?, updated_at = datetime('now') WHERE variant_id = ?");
  const updVar = db.prepare('UPDATE product_variants SET active = ? WHERE id = ?');

  for (const v of variants) {
    const s = sizeName.get(v.size_id);
    const c = colorName.get(v.color_id);
    if (!s || !c) throw new HttpError(400, 'Tamanho ou cor inexistente.');
    const found = existing.find((e) => e.size_id === v.size_id && e.color_id === v.color_id);
    const threshold = v.low_stock_threshold ?? 5;
    if (found) {
      keep.add(found.id);
      updVar.run(v.active === false ? 0 : 1, found.id);
      const r = updInv.run(v.quantity, threshold, found.id);
      if (!r.changes) insInv.run(found.id, v.quantity, threshold);
    } else {
      const id = insVariant.run(productId, v.size_id, v.color_id, skuFor(productId, s.name, c.name)).lastInsertRowid;
      keep.add(Number(id));
      insInv.run(id, v.quantity, threshold);
    }
  }
  for (const e of existing) {
    if (!keep.has(e.id)) db.prepare('DELETE FROM product_variants WHERE id = ?').run(e.id);
  }
}

function assertCategory(id) {
  if (id != null && !db.prepare('SELECT 1 FROM categories WHERE id = ?').get(id)) throw new HttpError(400, 'Categoria inexistente.');
}

export function createProduct(d) {
  assertCategory(d.category_id);
  const id = db.transaction(() => {
    const slug = uniqueSlug(db, 'products', d.name);
    const pid = db.prepare(`
      INSERT INTO products (name, slug, description, brand, gender, category_id, price, sale_price, fabric, care, featured, is_new, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(d.name, slug, d.description, d.brand, d.gender, d.category_id, d.price, d.sale_price, d.fabric, d.care,
        d.featured ? 1 : 0, d.is_new ? 1 : 0, d.active ? 1 : 0).lastInsertRowid;
    syncVariants(pid, d.variants);
    return Number(pid);
  })();
  return getProduct(id, { admin: true });
}

export function updateProduct(id, d) {
  const current = db.prepare('SELECT id, name FROM products WHERE id = ?').get(id);
  if (!current) throw new HttpError(404, 'Produto não encontrado.');
  assertCategory(d.category_id);
  db.transaction(() => {
    const slug = d.name !== current.name ? uniqueSlug(db, 'products', d.name, id) : undefined;
    db.prepare(`
      UPDATE products SET name = ?, slug = COALESCE(?, slug), description = ?, brand = ?, gender = ?, category_id = ?, price = ?,
        sale_price = ?, fabric = ?, care = ?, featured = ?, is_new = ?, active = ?, updated_at = datetime('now')
      WHERE id = ?`)
      .run(d.name, slug ?? null, d.description, d.brand, d.gender, d.category_id, d.price, d.sale_price, d.fabric, d.care,
        d.featured ? 1 : 0, d.is_new ? 1 : 0, d.active ? 1 : 0, id);
    if (d.variants) syncVariants(id, d.variants);
  })();
  return getProduct(id, { admin: true });
}

export function deleteProduct(id) {
  const imgs = db.prepare('SELECT path FROM product_images WHERE product_id = ?').all(id).map((r) => r.path);
  const r = db.prepare('DELETE FROM products WHERE id = ?').run(id);
  if (!r.changes) throw new HttpError(404, 'Produto não encontrado.');
  return imgs; // caller remove os arquivos
}
