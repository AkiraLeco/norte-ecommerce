import { z } from 'zod';
import { isValidCpf, onlyDigits } from './helpers.js';

const text = (max = 255) => z.string().trim().max(max);
const optText = (max = 255) => z.preprocess((v) => (v === '' || v == null ? null : v), z.string().trim().max(max).nullable()).default(null);
const intId = z.coerce.number().int().positive();
const bool = z.preprocess((v) => v === true || v === 'true' || v === '1' || v === 1, z.boolean());
const optInt = z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.number().int().min(0).nullable()).default(null);

export const registerSchema = z.object({
  name: text(120).min(2, 'Informe seu nome.'),
  email: z.string().trim().toLowerCase().email('E-mail inválido.').max(160),
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres.').max(100),
  phone: optText(30),
  cpf: z.preprocess((v) => (v === '' || v == null ? null : v), z.string().refine(isValidCpf, 'CPF inválido.').nullable()).default(null),
  guest_items: z.array(z.object({ variant_id: intId, quantity: intId.max(99) })).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  password: z.string().min(1, 'Informe a senha.'),
});

export const profileSchema = z.object({
  name: text(120).min(2, 'Informe seu nome.'),
  phone: optText(30),
  cpf: z.preprocess((v) => (v === '' || v == null ? null : v), z.string().refine(isValidCpf, 'CPF inválido.').nullable()).default(null),
});

export const passwordSchema = z.object({
  current_password: z.string().min(1, 'Informe a senha atual.'),
  new_password: z.string().min(8, 'A nova senha deve ter ao menos 8 caracteres.').max(100),
});

export const productQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  gender: z.enum(['masculino', 'feminino', 'unissex']).optional(),
  brand: z.string().trim().max(100).optional(),
  size: z.coerce.number().int().positive().optional(),
  color: z.coerce.number().int().positive().optional(),
  min: z.coerce.number().int().min(0).optional(),
  max: z.coerce.number().int().min(0).optional(),
  available: z.preprocess((v) => v === '1' || v === 'true', z.boolean()).optional(),
  promo: z.preprocess((v) => v === '1' || v === 'true', z.boolean()).optional(),
  new: z.preprocess((v) => v === '1' || v === 'true', z.boolean()).optional(),
  featured: z.preprocess((v) => v === '1' || v === 'true', z.boolean()).optional(),
  active: z.preprocess((v) => (v === undefined ? undefined : v === '1' || v === 'true'), z.boolean().optional()),
  exclude: z.coerce.number().int().positive().optional(),
  sort: z.enum(['recent', 'best', 'price_asc', 'price_desc', 'popular']).default('recent'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(12),
});

export const productSchema = z.object({
  name: text(160).min(2, 'Informe o nome do produto.'),
  description: optText(5000),
  brand: optText(80),
  gender: z.enum(['masculino', 'feminino', 'unissex']).default('unissex'),
  category_id: z.preprocess((v) => (v === '' || v == null ? null : v), intId.nullable()).default(null),
  price: z.coerce.number().int().min(1, 'Informe o preço.'),
  sale_price: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.number().int().min(1).nullable()).default(null),
  fabric: optText(300),
  care: optText(500),
  featured: bool.default(false),
  is_new: bool.default(false),
  active: bool.default(true),
  variants: z.array(z.object({
    size_id: intId,
    color_id: intId,
    quantity: z.coerce.number().int().min(0).max(100000),
    low_stock_threshold: z.coerce.number().int().min(0).max(1000).optional(),
    active: z.boolean().optional(),
  })).max(300).default([]),
}).refine((d) => d.sale_price == null || d.sale_price < d.price, { message: 'O preço promocional deve ser menor que o preço.', path: ['sale_price'] });

export const categorySchema = z.object({
  name: text(80).min(2, 'Informe o nome da categoria.'),
  description: optText(500),
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
  active: bool.default(true),
});

export const cartAddSchema = z.object({ variant_id: intId, quantity: intId.max(99).default(1) });
export const cartUpdateSchema = z.object({ variant_id: intId.optional(), quantity: intId.max(99).optional() })
  .refine((d) => d.variant_id || d.quantity, { message: 'Nada para atualizar.' });
export const cartSyncSchema = z.object({ items: z.array(z.object({ variant_id: intId, quantity: intId.max(99) })).max(100) });
export const cartResolveSchema = cartSyncSchema;

export const couponValidateSchema = z.object({ code: text(40).min(1, 'Informe o cupom.'), subtotal: z.coerce.number().int().min(0).optional() });
export const couponSchema = z.object({
  code: text(40).min(3, 'Código muito curto.').regex(/^[A-Za-z0-9_-]+$/, 'Use apenas letras, números, - e _.'),
  type: z.enum(['percent', 'fixed']),
  value: z.coerce.number().int().min(1, 'Informe o valor.'),
  min_purchase: z.coerce.number().int().min(0).default(0),
  max_uses: optInt,
  expires_at: z.preprocess((v) => (v === '' || v == null ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.').nullable()).default(null),
  active: bool.default(true),
}).refine((d) => d.type !== 'percent' || d.value <= 100, { message: 'Percentual máximo é 100.', path: ['value'] });

const addressFields = {
  zip: z.string().transform(onlyDigits).refine((v) => v.length === 8, 'CEP inválido.'),
  street: text(160).min(2, 'Informe a rua.'),
  number: text(20).min(1, 'Informe o número.'),
  complement: optText(80),
  district: text(80).min(2, 'Informe o bairro.'),
  city: text(80).min(2, 'Informe a cidade.'),
  state: text(2).length(2, 'Use a sigla do estado (UF).'),
};

export const addressSchema = z.object({
  label: optText(40),
  recipient: text(120).min(2, 'Informe o destinatário.'),
  ...addressFields,
  is_default: bool.default(false),
});

export const orderSchema = z.object({
  customer_name: text(120).min(3, 'Informe o nome completo.'),
  customer_email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  customer_phone: z.string().transform(onlyDigits).refine((v) => v.length >= 10 && v.length <= 11, 'Telefone inválido.'),
  customer_cpf: z.string().refine(isValidCpf, 'CPF inválido.'),
  shipping_address: z.object(addressFields),
  payment_method: text(40).min(1, 'Escolha a forma de pagamento.'),
  coupon_code: z.preprocess((v) => (v === '' ? undefined : v), text(40).optional()),
  notes: optText(500),
});

export const statusSchema = z.object({
  status: z.enum(['aguardando_pagamento', 'pagamento_confirmado', 'em_preparacao', 'enviado', 'entregue', 'cancelado']),
  note: optText(300),
  tracking_code: optText(60),
});

export const inventorySchema = z.object({
  quantity: z.coerce.number().int().min(0).max(100000),
  low_stock_threshold: z.coerce.number().int().min(0).max(1000).optional(),
});

export const favoriteSchema = z.object({ product_id: intId });

export const sizeSchema = z.object({ name: text(20).min(1), sort_order: z.coerce.number().int().min(0).default(100) });
export const colorSchema = z.object({
  name: text(40).min(2),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida (use #RRGGBB).'),
});

export const bannerSchema = z.object({
  slot: z.enum(['hero', 'promo', 'category']),
  title: text(120).min(1, 'Informe o título.'),
  subtitle: optText(200),
  cta_label: optText(40),
  link: optText(200),
  sort_order: z.coerce.number().int().min(0).default(0),
  active: bool.default(true),
});

const settingKeys = ['store_name', 'store_description', 'phone', 'whatsapp', 'email', 'address', 'instagram', 'facebook', 'tiktok',
  'about', 'policy_exchange', 'shipping_days'];
export const settingsSchema = z.object({
  ...Object.fromEntries(settingKeys.map((k) => [k, text(1000).optional()])),
  shipping_flat: z.coerce.number().int().min(0).optional(),
  shipping_free_min: z.coerce.number().int().min(0).optional(),
  installments_max: z.coerce.number().int().min(1).max(12).optional(),
  payment_methods: z.array(z.object({
    id: z.string().regex(/^[a-z0-9_]+$/).max(40),
    label: text(80).min(1),
    description: text(300),
    enabled: z.boolean(),
  })).max(10).optional(),
});
