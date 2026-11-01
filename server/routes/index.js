import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { optionalAuth, requireAuth, requireAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { uploaders } from '../middlewares/upload.js';
import * as S from '../utils/schemas.js';
import * as auth from '../controllers/authController.js';
import * as product from '../controllers/productController.js';
import * as category from '../controllers/categoryController.js';
import * as cart from '../controllers/cartController.js';
import * as order from '../controllers/orderController.js';
import * as inventory from '../controllers/inventoryController.js';
import * as favorite from '../controllers/favoriteController.js';
import * as coupon from '../controllers/couponController.js';
import * as admin from '../controllers/adminController.js';
import { publicSettings } from '../models/settingsModel.js';

const r = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
});

/* Público */
r.get('/health', (_req, res) => res.json({ ok: true }));
r.get('/settings', (_req, res) => res.json({ settings: publicSettings() }));
r.get('/banners', optionalAuth, admin.listBanners);
r.get('/sizes', admin.listSizes);
r.get('/colors', admin.listColors);
r.get('/shipping/quote', cart.quoteShipping);

/* Autenticação */
r.post('/auth/register', authLimiter, validate(S.registerSchema), auth.register);
r.post('/auth/login', authLimiter, validate(S.loginSchema), auth.login);
r.get('/auth/me', requireAuth, auth.me);
r.put('/auth/me', requireAuth, validate(S.profileSchema), auth.updateProfile);
r.put('/auth/password', requireAuth, validate(S.passwordSchema), auth.changePassword);

r.get('/addresses', requireAuth, auth.listAddresses);
r.post('/addresses', requireAuth, validate(S.addressSchema), auth.createAddress);
r.put('/addresses/:id', requireAuth, validate(S.addressSchema), auth.updateAddress);
r.delete('/addresses/:id', requireAuth, auth.deleteAddress);

/* Produtos */
r.get('/products', optionalAuth, validate(S.productQuerySchema, 'query'), product.list);
r.get('/products/filters', product.filters);
r.get('/products/:id', optionalAuth, product.get);
r.post('/products', requireAdmin, validate(S.productSchema), product.create);
r.put('/products/:id', requireAdmin, validate(S.productSchema), product.update);
r.delete('/products/:id', requireAdmin, product.remove);
r.post('/products/:id/images', requireAdmin, uploaders.products.array('images', 12), product.addImages);
r.put('/products/:id/images/:imageId', requireAdmin, product.updateImage);
r.delete('/products/:id/images/:imageId', requireAdmin, product.removeImage);

/* Categorias */
r.get('/categories', optionalAuth, category.list);
r.post('/categories', requireAdmin, uploaders.categories.single('image'), validate(S.categorySchema), category.create);
r.put('/categories/:id', requireAdmin, uploaders.categories.single('image'), validate(S.categorySchema), category.update);
r.delete('/categories/:id', requireAdmin, category.remove);

/* Carrinho */
r.post('/cart/resolve', validate(S.cartResolveSchema), cart.resolve);
r.get('/cart', requireAuth, cart.get);
r.post('/cart/items', requireAuth, validate(S.cartAddSchema), cart.add);
r.post('/cart/sync', requireAuth, validate(S.cartSyncSchema), cart.sync);
r.put('/cart/items/:id', requireAuth, validate(S.cartUpdateSchema), cart.update);
r.delete('/cart/items/:id', requireAuth, cart.remove);

/* Pedidos */
r.post('/orders', requireAuth, validate(S.orderSchema), order.create);
r.get('/orders', requireAuth, order.list);
r.get('/orders/:id', requireAuth, order.get);
r.put('/orders/:id/status', requireAdmin, validate(S.statusSchema), order.setStatus);

/* Estoque */
r.get('/inventory', requireAdmin, inventory.list);
r.put('/inventory/:id', requireAdmin, validate(S.inventorySchema), inventory.update);

/* Favoritos */
r.get('/favorites', requireAuth, favorite.list);
r.post('/favorites', requireAuth, validate(S.favoriteSchema), favorite.add);
r.delete('/favorites/:id', requireAuth, favorite.remove);

/* Cupons */
r.post('/coupons/validate', validate(S.couponValidateSchema), coupon.validate);
r.get('/coupons', requireAdmin, coupon.list);
r.post('/coupons', requireAdmin, validate(S.couponSchema), coupon.create);
r.put('/coupons/:id', requireAdmin, validate(S.couponSchema), coupon.update);
r.delete('/coupons/:id', requireAdmin, coupon.remove);

/* Administração */
r.get('/admin/dashboard', requireAdmin, admin.dashboard);
r.get('/admin/customers', requireAdmin, admin.customers);
r.put('/admin/customers/:id/active', requireAdmin, admin.setCustomerActive);
r.get('/admin/settings', requireAdmin, admin.getSettings);
r.put('/admin/settings', requireAdmin, validate(S.settingsSchema), admin.putSettings);
r.post('/admin/settings/logo', requireAdmin, uploaders.banners.single('logo'), admin.uploadLogo);
r.delete('/admin/settings/logo', requireAdmin, admin.removeLogo);
r.post('/admin/banners', requireAdmin, uploaders.banners.single('image'), validate(S.bannerSchema), admin.createBanner);
r.put('/admin/banners/:id', requireAdmin, uploaders.banners.single('image'), validate(S.bannerSchema), admin.updateBanner);
r.delete('/admin/banners/:id', requireAdmin, admin.deleteBanner);
r.post('/admin/sizes', requireAdmin, validate(S.sizeSchema), admin.createSize);
r.post('/admin/colors', requireAdmin, validate(S.colorSchema), admin.createColor);
r.post('/admin/backup', requireAdmin, admin.backup);

export default r;
