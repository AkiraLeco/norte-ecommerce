import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useDocumentTitle, useFetch } from '../../hooks/hooks.js';
import { dateTime, maskCep, maskCpf, maskPhone, money, PAYMENT_LABELS, STATUS } from '../../services/format.js';
import { ConfirmDialog, Field, Spinner, StatusPill } from '../../components/ui.jsx';

export default function OrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { data: o, loading, error, reload } = useFetch(() => api.get(`/orders/${id}`).then((r) => r.item), [id]);
  useDocumentTitle(o ? `Pedido ${o.number} — Admin` : 'Pedido');
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [tracking, setTracking] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => { if (o) { setStatus(o.status); setTracking(o.tracking_code || ''); setNote(''); } }, [o]);

  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/orders/${id}/status`, { status, note, tracking_code: tracking || undefined });
      toast.success('Pedido atualizado.'); setConfirmCancel(false); reload();
    } catch (e) { toast.error(e.message); setConfirmCancel(false); }
    setBusy(false);
  };

  if (loading) return <div className="skeleton" style={{ height: 400 }} />;
  if (error) return <div className="alert alert-error">{error}</div>;
  const locked = o.status === 'cancelado';
  const changed = status !== o.status || (tracking && tracking !== (o.tracking_code || ''));

  return (
    <>
      <div className="admin-title">
        <div className="row-gap"><Link to="/admin/pedidos" className="icon-btn" aria-label="Voltar"><ArrowLeft /></Link><h1>Pedido {o.number}</h1><StatusPill status={o.status} /></div>
        <span className="muted">{dateTime(o.created_at)}</span>
      </div>
      <div className="two-col">
        <div className="stack">
          <section className="panel">
            <h2>Itens do pedido</h2>
            {o.items.map((i) => (
              <div className="list-row" key={i.id}>
                {i.image && <img src={i.image} alt="" />}
                <div className="grow"><b>{i.name}</b><span className="muted" style={{ fontSize: 12.5 }}>{i.color} · {i.size} · {money(i.unit_price)} × {i.quantity}</span></div>
                <strong>{money(i.total)}</strong>
              </div>
            ))}
            <div className="totals" style={{ marginTop: 14 }}>
              <div className="row"><span>Subtotal</span><span>{money(o.subtotal)}</span></div>
              {o.discount > 0 && <div className="row discount"><span>Desconto {o.coupon_code && `(${o.coupon_code})`}</span><span>− {money(o.discount)}</span></div>}
              <div className="row"><span>Frete</span><span>{o.shipping ? money(o.shipping) : 'Grátis'}</span></div>
              <div className="row total"><span>Total</span><span>{money(o.total)}</span></div>
            </div>
          </section>
          <div className="dash-grid even">
            <section className="panel stack" style={{ gap: 6 }}>
              <h2>Cliente</h2>
              <b>{o.customer_name}</b><span>{o.customer_email}</span><span>{maskPhone(o.customer_phone)}</span>{o.customer_cpf && <span>CPF {maskCpf(o.customer_cpf)}</span>}
              {o.notes && <p className="alert alert-info" style={{ marginTop: 8 }}>Obs.: {o.notes}</p>}
            </section>
            <section className="panel stack" style={{ gap: 6 }}>
              <h2>Entrega e pagamento</h2>
              <span>{o.ship_street}, {o.ship_number}{o.ship_complement ? ` — ${o.ship_complement}` : ''}</span>
              <span>{o.ship_district} · {o.ship_city}/{o.ship_state}</span><span>CEP {maskCep(o.ship_zip)}</span>
              <span style={{ marginTop: 8 }}><b>Pagamento:</b> {PAYMENT_LABELS[o.payment_method] || o.payment_method}</span>
            </section>
          </div>
        </div>

        <aside className="stack">
          <section className="panel stack">
            <h2>Atualizar pedido</h2>
            {locked ? <div className="alert alert-error">Pedido cancelado — estoque devolvido. Não é possível alterar.</div> : (
              <>
                <Field label="Status" htmlFor="o-status"><select id="o-status" className="select" value={status} onChange={(e) => setStatus(e.target.value)}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
                <Field label="Código de rastreio" htmlFor="o-track"><input id="o-track" className="input" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Opcional" /></Field>
                <Field label="Observação interna" htmlFor="o-note"><textarea id="o-note" className="textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
                {status === 'pagamento_confirmado' && o.status === 'aguardando_pagamento' && <div className="alert alert-warn">Confirme apenas após conferir o recebimento do pagamento.</div>}
                <button className="btn" disabled={busy || !changed} onClick={() => (status === 'cancelado' ? setConfirmCancel(true) : save())}>{busy ? <Spinner /> : 'Salvar alterações'}</button>
              </>
            )}
          </section>
          <section className="panel">
            <h2>Histórico</h2>
            <ul className="history">{[...o.history].reverse().map((h, i) => <li key={i}><strong>{h.status_label}</strong>{h.note && <span> — {h.note}</span>}<time>{dateTime(h.created_at)}</time></li>)}</ul>
          </section>
        </aside>
      </div>
      <ConfirmDialog open={confirmCancel} title="Cancelar pedido?" text="O estoque dos itens e o uso do cupom serão devolvidos. Esta ação não pode ser desfeita." confirmLabel="Cancelar pedido" danger busy={busy} onConfirm={save} onCancel={() => setConfirmCancel(false)} />
    </>
  );
}
