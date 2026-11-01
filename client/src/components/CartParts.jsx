import { Link } from 'react-router-dom';
import { Trash2, ShoppingBag, X, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { money } from '../services/format.js';
import { Drawer, EmptyState, QtyStepper } from './ui.jsx';

export function CartLine({ item, editable = true, big = false }) {
  const { updateItem, removeItem } = useCart();
  const sameColor = item.options.filter((o) => o.color_id === item.color_id);
  const colors = [...new Map(item.options.map((o) => [o.color_id, o])).values()];

  const pick = (colorId, sizeId) => {
    const target = item.options.find((o) => o.color_id === colorId && o.size_id === sizeId);
    if (target) updateItem(item, { variant_id: target.variant_id });
  };

  // Ao trocar a cor, mantém o tamanho se houver estoque; senão usa o primeiro tamanho disponível.
  const changeColor = (colorId) => {
    const ofColor = item.options.filter((o) => o.color_id === colorId);
    const target = ofColor.find((o) => o.size_id === item.size_id && o.stock > 0) || ofColor.find((o) => o.stock > 0) || ofColor[0];
    if (target) pick(colorId, target.size_id);
  };

  return (
    <li className="line">
      <Link to={`/produto/${item.slug}`}><img src={item.image || ''} alt={item.name} /></Link>
      <div className="line-info">
        <Link to={`/produto/${item.slug}`}><h4>{item.name}</h4></Link>
        {editable && big ? (
          <div className="line-meta">
            <select className="select mini-select" aria-label="Cor" value={item.color_id}
              onChange={(e) => changeColor(Number(e.target.value))}>
              {colors.map((c) => <option key={c.color_id} value={c.color_id}>{c.color}</option>)}
            </select>
            <select className="select mini-select" aria-label="Tamanho" value={item.size_id} onChange={(e) => pick(item.color_id, Number(e.target.value))}>
              {sameColor.map((o) => <option key={o.size_id} value={o.size_id} disabled={o.stock <= 0 && o.size_id !== item.size_id}>{o.size}{o.stock <= 0 ? ' (esgotado)' : ''}</option>)}
            </select>
          </div>
        ) : (
          <div className="line-meta"><span className="swatch" style={{ background: item.hex }} /> {item.color} · {item.size}</div>
        )}
        {!item.available && <span className="field-error">Item indisponível — remova para continuar.</span>}
        {item.available && item.exceeds_stock && <span className="field-error">Restam apenas {item.stock} unidade(s).</span>}
        <div className="price"><strong>{money(item.unit_price)}</strong>{item.original_price > item.unit_price && <s>{money(item.original_price)}</s>}</div>
        <div className="line-actions">
          {editable
            ? <QtyStepper small value={item.quantity} max={Math.max(item.stock, 1)} onChange={(q) => updateItem(item, { quantity: q })} />
            : <span className="muted">Qtd: {item.quantity}</span>}
          <strong>{money(item.line_total)}</strong>
          {editable && <button className="remove-btn" onClick={() => removeItem(item)} aria-label={`Remover ${item.name} do carrinho`}><Trash2 size={14} /> Remover</button>}
        </div>
      </div>
    </li>
  );
}

export function FreeShippingBar({ subtotal }) {
  const { settings } = useStore();
  const min = settings.shipping_free_min;
  if (!min) return null;
  const missing = min - subtotal;
  return (
    <div>
      <p style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Truck size={16} />
        {missing > 0 ? <>Faltam <strong>{money(missing)}</strong> para o frete grátis</> : <strong>Você ganhou frete grátis!</strong>}
      </p>
      <div className="free-ship" style={{ marginTop: 8 }}><i style={{ width: `${Math.min(100, (subtotal / min) * 100)}%` }} /></div>
    </div>
  );
}

export default function CartDrawer() {
  const { items, subtotal, count, drawerOpen, closeDrawer } = useCart();
  return (
    <Drawer open={drawerOpen} onClose={closeDrawer} label="Carrinho de compras">
      <div className="drawer-head">
        <h2 className="title-md">Carrinho ({count})</h2>
        <button className="icon-btn" onClick={closeDrawer} aria-label="Fechar carrinho"><X size={20} /></button>
      </div>
      <div className="drawer-body">
        {items.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="Seu carrinho está vazio" text="Explore a coleção e encontre sua próxima peça."
            action={<Link to="/catalogo" className="btn btn-sm" onClick={closeDrawer}>Explorar produtos</Link>} />
        ) : (
          <ul>{items.map((i) => <CartLine key={i.id} item={i} />)}</ul>
        )}
      </div>
      {items.length > 0 && (
        <div className="drawer-foot">
          <FreeShippingBar subtotal={subtotal} />
          <div className="totals"><div className="row total"><span>Subtotal</span><span>{money(subtotal)}</span></div></div>
          <p className="muted" style={{ fontSize: 12.5 }}>Frete e cupons calculados na próxima etapa.</p>
          <Link to="/checkout" className="btn btn-block" onClick={closeDrawer}>Finalizar compra</Link>
          <Link to="/carrinho" className="btn btn-outline btn-block" onClick={closeDrawer}>Ver carrinho completo</Link>
        </div>
      )}
    </Drawer>
  );
}
