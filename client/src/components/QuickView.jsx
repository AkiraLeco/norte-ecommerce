import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { api } from '../services/api.js';
import { useFetch, useVariantSelection } from '../hooks/hooks.js';
import { useCart } from '../context/CartContext.jsx';
import { Modal, Price, ProductCardSkeleton, Spinner } from './ui.jsx';
import VariantPicker from './VariantPicker.jsx';

function QuickBody({ productId, onClose }) {
  const { data, loading, error } = useFetch(() => api.get(`/products/${productId}`).then((r) => r.item), [productId]);
  const { addItem } = useCart();
  const sel = useVariantSelection(data);
  const [showError, setShowError] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading) return <div style={{ padding: 36 }}><ProductCardSkeleton /></div>;
  if (error) return <div className="alert alert-error" style={{ margin: 24 }}>{error}</div>;

  const colorImg = data.images.find((i) => i.color_id === sel.colorId) || data.images[0];

  const add = async () => {
    if (!sel.variant || sel.variant.stock <= 0) { setShowError(true); return; }
    setBusy(true);
    const ok = await addItem(sel.variant.id, sel.qty);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <div className="quick">
      <div className="gallery-main">{colorImg && <img src={colorImg.path} alt={data.name} />}</div>
      <div className="quick-info">
        <div>
          <span className="pcard-cat">{data.category_name}</span>
          <h2 className="title-md" style={{ fontSize: 26, marginTop: 4 }}>{data.name}</h2>
        </div>
        <Price product={data} big />
        <p className="muted" style={{ fontSize: 14 }}>{data.description}</p>
        <VariantPicker product={data} sel={sel} showError={showError} />
        <button className="btn btn-block" onClick={add} disabled={busy}>
          {busy ? <Spinner /> : <><ShoppingBag size={16} /> Adicionar ao carrinho</>}
        </button>
        <Link to={`/produto/${data.slug}`} onClick={onClose} className="link-arrow" style={{ alignSelf: 'flex-start' }}>Ver detalhes completos</Link>
      </div>
    </div>
  );
}

export default function QuickView({ product, onClose }) {
  return (
    <Modal open={!!product} onClose={onClose} label={product ? `Visualização rápida: ${product.name}` : ''} flush>
      {product && <QuickBody productId={product.id} onClose={onClose} />}
    </Modal>
  );
}
