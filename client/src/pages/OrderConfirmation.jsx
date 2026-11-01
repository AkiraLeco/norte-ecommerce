import { Link, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { api } from '../services/api.js';
import { useDocumentTitle, useFetch } from '../hooks/hooks.js';
import { money, PAYMENT_LABELS } from '../services/format.js';
import { EmptyState, Spinner, StatusPill } from '../components/ui.jsx';
import { useStore } from '../context/StoreContext.jsx';

export default function OrderConfirmation() {
  useDocumentTitle('Pedido realizado');
  const { id } = useParams();
  const { settings } = useStore();
  const { data: o, loading, error } = useFetch(() => api.get(`/orders/${id}`).then((r) => r.item), [id]);

  if (loading) return <div style={{ minHeight: '50vh', display: 'grid', placeItems: 'center' }}><Spinner /></div>;
  if (error) return <div className="container"><EmptyState title="Pedido não encontrado" action={<Link className="btn btn-sm" to="/conta/pedidos">Meus pedidos</Link>} /></div>;

  const wa = settings.whatsapp ? `https://wa.me/${String(settings.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Fiz o pedido ${o.number} e gostaria de combinar o pagamento.`)}` : null;

  return (
    <div className="confirm">
      <div className="check-big"><Check size={34} strokeWidth={2.2} /></div>
      <span className="eyebrow">Pedido recebido</span>
      <h1 className="title-lg">Obrigado, {o.customer_name.split(' ')[0]}!</h1>
      <p className="muted">Anote o número do seu pedido:</p>
      <div className="order-number" aria-label={`Número do pedido ${o.number}`}>{o.number}</div>
      <StatusPill status={o.status} />

      <div className="box">
        <h2 className="title-md">Próximos passos</h2>
        <p>Seu pedido está <strong>aguardando a confirmação do pagamento</strong>. Forma escolhida: <strong>{PAYMENT_LABELS[o.payment_method] || o.payment_method}</strong>.</p>
        <p className="muted">A loja entrará em contato em <strong>{o.customer_email}</strong> com as instruções para pagamento e confirmará manualmente. Você pode acompanhar cada etapa em “Meus pedidos”.</p>
        {wa && <a className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} href={wa} target="_blank" rel="noreferrer">Falar com a loja no WhatsApp</a>}
      </div>

      <div className="box">
        <h2 className="title-md">Resumo</h2>
        {o.items.map((i) => (
          <div className="mini-line" key={i.id}>
            <img src={i.image || ''} alt="" />
            <div><strong style={{ fontWeight: 600 }}>{i.name}</strong><div className="muted" style={{ fontSize: 12 }}>{i.color} · {i.size} · Qtd {i.quantity}</div></div>
            <span>{money(i.total)}</span>
          </div>
        ))}
        <div className="totals">
          <div className="row"><span>Subtotal</span><span>{money(o.subtotal)}</span></div>
          {o.discount > 0 && <div className="row discount"><span>Desconto {o.coupon_code && `(${o.coupon_code})`}</span><span>− {money(o.discount)}</span></div>}
          <div className="row"><span>Frete</span><span>{o.shipping ? money(o.shipping) : 'Grátis'}</span></div>
          <div className="row total"><span>Total</span><span>{money(o.total)}</span></div>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>Entrega em: {o.ship_street}, {o.ship_number}{o.ship_complement ? ` — ${o.ship_complement}` : ''} · {o.ship_district} · {o.ship_city}/{o.ship_state}</p>
      </div>

      <div className="row-gap" style={{ justifyContent: 'center' }}>
        <Link to={`/conta/pedidos/${o.id}`} className="btn">Acompanhar pedido</Link>
        <Link to="/catalogo" className="btn btn-outline">Continuar comprando</Link>
      </div>
    </div>
  );
}
