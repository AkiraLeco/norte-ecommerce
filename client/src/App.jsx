import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { RequireAdmin, RequireAuth } from './components/guards.jsx';
import { Spinner } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
import Product from './pages/Product.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderConfirmation from './pages/OrderConfirmation.jsx';
import { Login, Register } from './pages/AuthPages.jsx';
import Collections from './pages/Collections.jsx';
import Institutional from './pages/Institutional.jsx';
import NotFound from './pages/NotFound.jsx';
import Account, { Profile, Orders, OrderDetail, Addresses, Favorites, Password } from './pages/Account.jsx';

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const AdminProducts = lazy(() => import('./pages/admin/Products.jsx'));
const ProductForm = lazy(() => import('./pages/admin/ProductForm.jsx'));
const AdminCategories = lazy(() => import('./pages/admin/Categories.jsx'));
const AdminOrders = lazy(() => import('./pages/admin/Orders.jsx'));
const AdminOrderDetail = lazy(() => import('./pages/admin/OrderDetail.jsx'));
const AdminInventory = lazy(() => import('./pages/admin/Inventory.jsx'));
const AdminCoupons = lazy(() => import('./pages/admin/Coupons.jsx'));
const AdminCustomers = lazy(() => import('./pages/admin/Customers.jsx'));
const AdminSettings = lazy(() => import('./pages/admin/Settings.jsx'));

const Fallback = <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}><Spinner /></div>;

export default function App() {
  return (
    <Suspense fallback={Fallback}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="catalogo" element={<Catalog />} />
          <Route path="colecoes" element={<Collections />} />
          <Route path="produto/:slug" element={<Product />} />
          <Route path="carrinho" element={<Cart />} />
          <Route path="checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="pedido/confirmado/:id" element={<RequireAuth><OrderConfirmation /></RequireAuth>} />
          <Route path="entrar" element={<Login />} />
          <Route path="cadastrar" element={<Register />} />
          <Route path="institucional" element={<Institutional />} />
          <Route path="conta" element={<RequireAuth><Account /></RequireAuth>}>
            <Route index element={<Profile />} />
            <Route path="pedidos" element={<Orders />} />
            <Route path="pedidos/:id" element={<OrderDetail />} />
            <Route path="enderecos" element={<Addresses />} />
            <Route path="favoritos" element={<Favorites />} />
            <Route path="senha" element={<Password />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<Dashboard />} />
          <Route path="produtos" element={<AdminProducts />} />
          <Route path="produtos/novo" element={<ProductForm />} />
          <Route path="produtos/:id" element={<ProductForm />} />
          <Route path="categorias" element={<AdminCategories />} />
          <Route path="pedidos" element={<AdminOrders />} />
          <Route path="pedidos/:id" element={<AdminOrderDetail />} />
          <Route path="estoque" element={<AdminInventory />} />
          <Route path="cupons" element={<AdminCoupons />} />
          <Route path="clientes" element={<AdminCustomers />} />
          <Route path="configuracoes" element={<AdminSettings />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
