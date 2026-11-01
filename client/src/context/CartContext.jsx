import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const LS_KEY = 'norte_cart';
const EMPTY = { items: [], count: 0, subtotal: 0 };

const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; }
};
const writeLocal = (items) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch { /* storage indisponível */ }
};

// Visitantes: carrinho no localStorage (só variação + quantidade). Logados: carrinho no SQLite via API.
export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [cart, setCart] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const resolveGuest = useCallback(async (list) => {
    if (!list.length) return EMPTY;
    const data = await api.post('/cart/resolve', { items: list });
    // Ajusta quantidades que passam do estoque e descarta variações que não existem mais.
    const fixed = data.items.filter((i) => i.available).map((i) => ({ variant_id: i.variant_id, quantity: Math.min(i.quantity, i.stock) }));
    if (fixed.length !== list.length || data.items.some((i) => i.exceeds_stock)) {
      writeLocal(fixed);
      return fixed.length ? api.post('/cart/resolve', { items: fixed }) : EMPTY;
    }
    return data;
  }, []);

  const refresh = useCallback(async () => {
    try {
      setCart(user ? await api.get('/cart') : await resolveGuest(readLocal()));
    } catch { /* mantém o estado atual */ }
  }, [user, resolveGuest]);

  useEffect(() => {
    if (authLoading) return;
    (async () => {
      try {
        const local = readLocal();
        if (user && local.length) {
          setCart(await api.post('/cart/sync', { items: local })); // mescla o carrinho de visitante
          writeLocal([]);
        } else {
          await refresh();
        }
      } catch { /* ignora */ }
      setLoading(false);
    })();
  }, [user, authLoading, refresh]);

  const run = useCallback(async (fn, successMsg) => {
    try {
      const next = await fn();
      if (next) setCart(next);
      if (successMsg) toast.success(successMsg);
      return true;
    } catch (e) {
      toast.error(e.message);
      await refresh();
      return false;
    }
  }, [toast, refresh]);

  const addItem = useCallback(async (variantId, quantity = 1, { openDrawer = true, silent = false } = {}) => {
    const ok = await run(async () => {
      if (user) return api.post('/cart/items', { variant_id: variantId, quantity });
      const local = readLocal();
      const found = local.find((i) => i.variant_id === variantId);
      if (found) found.quantity += quantity; else local.push({ variant_id: variantId, quantity });
      writeLocal(local);
      const data = await api.post('/cart/resolve', { items: local });
      const item = data.items.find((i) => i.variant_id === variantId);
      if (!item || !item.available) { writeLocal(local.filter((i) => i.variant_id !== variantId)); throw new Error('Este item está esgotado.'); }
      if (item.exceeds_stock) {
        found ? (found.quantity = item.stock) : (local.find((i) => i.variant_id === variantId).quantity = item.stock);
        writeLocal(local);
        throw new Error(`Estoque insuficiente. Restam ${item.stock} unidade(s).`);
      }
      return data;
    }, silent ? null : 'Produto adicionado ao carrinho.');
    if (ok && openDrawer) setDrawerOpen(true);
    return ok;
  }, [user, run]);

  const updateItem = useCallback((item, changes) => run(async () => {
    if (user) return api.put(`/cart/items/${item.id}`, changes);
    let local = readLocal();
    const target = changes.variant_id ?? item.variant_id;
    const qty = changes.quantity ?? item.quantity;
    local = local.filter((i) => i.variant_id !== item.variant_id);
    const clash = local.find((i) => i.variant_id === target);
    if (clash) clash.quantity += qty; else local.push({ variant_id: target, quantity: qty });
    writeLocal(local);
    const data = await api.post('/cart/resolve', { items: local });
    const bad = data.items.find((i) => i.exceeds_stock || !i.available);
    if (bad) {
      writeLocal(local.map((i) => (i.variant_id === bad.variant_id ? { ...i, quantity: Math.max(1, bad.stock) } : i)).filter((i) => i.quantity > 0));
      throw new Error(bad.available ? `Estoque insuficiente. Restam ${bad.stock} unidade(s).` : 'Este item está esgotado.');
    }
    return data;
  }), [user, run]);

  const removeItem = useCallback((item) => run(async () => {
    if (user) return api.delete(`/cart/items/${item.id}`);
    const local = readLocal().filter((i) => i.variant_id !== item.variant_id);
    writeLocal(local);
    return local.length ? api.post('/cart/resolve', { items: local }) : EMPTY;
  }), [user, run]);

  const value = useMemo(() => ({
    ...cart, loading, drawerOpen, refresh,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
    addItem, updateItem, removeItem,
    reset: () => setCart(EMPTY),
  }), [cart, loading, drawerOpen, refresh, addItem, updateItem, removeItem]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
