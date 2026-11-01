import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

const DEFAULTS = { store_name: 'NORTE', shipping_flat: 0, shipping_free_min: 0, installments_max: 1, payment_methods: [] };

// Configurações públicas da loja + favoritos do usuário.
export function StoreProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [settings, setSettings] = useState(DEFAULTS);
  const [favIds, setFavIds] = useState([]);

  const loadSettings = useCallback(() => api.get('/settings').then((r) => setSettings({ ...DEFAULTS, ...r.settings })).catch(() => {}), []);
  useEffect(() => { loadSettings(); }, [loadSettings]);

  useEffect(() => {
    if (!user) { setFavIds([]); return; }
    api.get('/favorites').then((r) => setFavIds(r.ids)).catch(() => {});
  }, [user]);

  const toggleFavorite = useCallback(async (productId) => {
    if (!user) {
      toast.info('Entre na sua conta para salvar favoritos.');
      navigate(`/entrar?next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    const has = favIds.includes(productId);
    setFavIds((ids) => (has ? ids.filter((i) => i !== productId) : [productId, ...ids]));
    try {
      if (has) await api.delete(`/favorites/${productId}`); else await api.post('/favorites', { product_id: productId });
      toast.success(has ? 'Removido dos favoritos.' : 'Adicionado aos favoritos.');
    } catch (e) {
      setFavIds((ids) => (has ? [productId, ...ids] : ids.filter((i) => i !== productId)));
      toast.error(e.message);
    }
  }, [user, favIds, toast, navigate, location]);

  const value = useMemo(() => ({ settings, reloadSettings: loadSettings, favIds, toggleFavorite }), [settings, loadSettings, favIds, toggleFavorite]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
