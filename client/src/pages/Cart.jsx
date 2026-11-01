import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Tag, X } from 'lucide-react';
import { api } from '../services/api.js';
import { useCart } from '../context/CartContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/hooks.js';
import { money } from '../services/format.js';
import { CartLine, FreeShippingBar } from '../components/CartParts.jsx';
import { EmptyState, Spinner } from '../components/ui.jsx';

// Cupom e frete compartilhados com o checkout (cupom guardado em sessionStorage).
export const COUPON_KEY = 'norte_coupon';
export const loadCoupon = () => { try { return JSON.parse(sessionStorage.getItem(COUPON_KEY)); } catch { return null; } };
export const saveCoupon = (c) => { try { c ? sessionStorage.setItem(COUPON_KEY, JSON.stringify(c)) : sessionStorage.removeItem(COUPON_KEY); } catch { /* ignora */ } };

export function useCouponSummary() {
  const { subtotal } = useCart();
  const { settings } = useStore();
  const toast = useToast();
  const [coupon, setCoupon] = useState(loadCoupon());
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  // Revalida sempre contra o subtotal atual (o valor do desconto muda com o carrinho).
  const apply = async (c = code) => {
    if (!c.trim()) return;
    setBusy(true);
    try {
      const r = await api.post('/coupons/validate', { code: c.trim(), subtotal });
      const next = { code: r.code, type: r.type, value: r.value };
      saveCoupon(next); setCoupon(next); setCode('');
      toast.success(`Cupom ${r.code} aplicado.`);
    } catch (e) { toast.error(e.message); }
    setBusy(false);
  };
  const remove = () => { saveCoupon(null); setCoupon(null); };

  let discount = 0;
  if (coupon) discount = Math.min(subtotal, coupon.type === 'percent' ? Math.floor((subtotal * coupon.value) / 100) : coupon.value);
  const shipping = subtotal <= 0 ? 0 : settings.shipping_free_min > 0 && subtotal >= settings.shipping_free_min ? 0 : settings.shipping_flat;
  return { coupon, code, setCode, apply, remove, busy, discount, shipping, total: subtotal - discount + shipping };
}

export function CouponBox({ cs }) {
  return (
    <div>
      {cs.coupon ? (
        <div className="alert alert-ok" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Tag size={16} /> {cs.coupon.code} aplicado</span>
          <button onClick={cs.remove} aria-label="Remover cupom"><X size={16} /></button>
        </div>
      ) : (
        <div className="coupon-form">
          <input className="input" placeholder="Cupom de desconto" aria-label="Cupom de desconto" value={cs.code} onChange={(e) => cs.setCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); cs.apply(); } }} />
          <button type="button" className="btn btn-outline btn-sm" style={{ minHeight: 44 }} disabled={cs.busy || !cs.code.trim()} onClick={() => cs.apply()}>{cs.busy ? <Spinner /> : 'Aplicar'}</button>
        </div>
      )}
    </div>
  );
}

export function Totals({ subtotal, cs }) {
  return (
    <div className="totals">
      <div className="row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
      {cs.discount > 0 && <div className="row discount"><span>Desconto ({cs.coupon.code})</span><span>− {money(cs.discount)}</span></div>}
      <div className="row"><span>Frete</span><span>{cs.shipping === 0 ? 'Grátis' : money(cs.shipping)}</span></div>
      <div className="row total"><span>Total</span><span>{money(cs.total)}</span></div>
    </div>
  );
}

export default function Cart() {
  useDocumentTitle('Carrinho');
  const { items, count, subtotal, loading } = useCart();
  const navigate = useNavigate();
  const cs = useCouponSummary();
  const blocked = items.some((i) => !i.available || i.exceeds_stock);

  if (!loading && items.length === 0) {
    return (
      <div className="container">
        <EmptyState icon={ShoppingBag} title="Seu carrinho está vazio" text="Adicione peças para continuar."
          action={<Link to="/catalogo" className="btn">Explorar produtos</Link>} />
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-head" style={{ borderBottom: 0 }}><h1 className="title-lg">Carrinho <span className="muted" style={{ fontSize: '0.5em' }}>({count} {count === 1 ? 'item' : 'itens'})</span></h1></div>
      <div className="cart-page" style={{ paddingTop: 8 }}>
        <ul className="cart-lines">{items.map((i) => <CartLine key={i.id} item={i} big />)}</ul>
        <aside className="summary-box" aria-label="Resumo do pedido">
          <h2 className="title-md">Resumo</h2>
          <FreeShippingBar subtotal={subtotal} />
          <CouponBox cs={cs} />
          <Totals subtotal={subtotal} cs={cs} />
          {blocked && <div className="alert alert-warn">Ajuste os itens indisponíveis ou com estoque insuficiente para continuar.</div>}
          <button className="btn btn-block" disabled={blocked} onClick={() => navigate('/checkout')}>Finalizar compra</button>
          <Link to="/catalogo" className="link-arrow" style={{ alignSelf: 'center' }}>Continuar comprando</Link>
        </aside>
      </div>
    </div>
  );
}
