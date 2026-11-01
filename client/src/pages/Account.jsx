import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { User, Package, MapPin, Heart, KeyRound, LogOut, Pencil, Trash2, Plus, ShieldCheck } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle, useFetch } from '../hooks/hooks.js';
import { dateTime, maskCep, maskCpf, maskPhone, money, PAYMENT_LABELS, STATUS_FLOW, UF } from '../services/format.js';
import { ConfirmDialog, EmptyState, Field, Modal, Pagination, Spinner, StatusPill } from '../components/ui.jsx';
import ProductCard from '../components/ProductCard.jsx';

export default function Account() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const links = [
    ['/conta', 'Meu perfil', User, true], ['/conta/pedidos', 'Meus pedidos', Package], ['/conta/enderecos', 'Endereços', MapPin],
    ['/conta/favoritos', 'Favoritos', Heart], ['/conta/senha', 'Alterar senha', KeyRound],
  ];
  return (
    <div className="container">
      <div className="page-head" style={{ borderBottom: 0 }}>
        <span className="eyebrow">Minha conta</span>
        <h1 className="title-lg" style={{ marginTop: 6 }}>Olá, {user.name.split(' ')[0]}</h1>
      </div>
      <div className="account">
        <nav className="account-nav" aria-label="Área do cliente">
          {links.map(([to, label, Icon, end]) => <NavLink key={to} to={to} end={end}><Icon size={17} /> {label}</NavLink>)}
          {isAdmin && <NavLink to="/admin"><ShieldCheck size={17} /> Painel administrativo</NavLink>}
          <a href="/" onClick={(e) => { e.preventDefault(); logout(); navigate('/'); }}><LogOut size={17} /> Sair</a>
        </nav>
        <div style={{ minWidth: 0 }}><Outlet /></div>
      </div>
    </div>
  );
}

export function Profile() {
  useDocumentTitle('Meu perfil');
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, phone: maskPhone(user.phone || ''), cpf: maskCpf(user.cpf || '') });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErrors({});
    try {
      const r = await api.put('/auth/me', form);
      setUser(r.user); toast.success('Perfil atualizado.');
    } catch (err) {
      toast.error(err.message);
      if (err.details) setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
    }
    setBusy(false);
  };
  return (
    <form className="stack" onSubmit={submit} style={{ maxWidth: 560 }}>
      <h2 className="title-md">Dados pessoais</h2>
      <Field label="Nome completo" htmlFor="p-name" error={errors.name}><input id="p-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="E-mail" htmlFor="p-email" hint="O e-mail não pode ser alterado."><input id="p-email" className="input" value={user.email} disabled /></Field>
      <div className="form-grid cols-2">
        <Field label="Telefone" htmlFor="p-phone"><input id="p-phone" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })} /></Field>
        <Field label="CPF" htmlFor="p-cpf" error={errors.cpf}><input id="p-cpf" className="input" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: maskCpf(e.target.value) })} /></Field>
      </div>
      <button className="btn" style={{ alignSelf: 'flex-start' }} disabled={busy}>{busy ? <Spinner /> : 'Salvar alterações'}</button>
    </form>
  );
}

export function Orders() {
  useDocumentTitle('Meus pedidos');
  const [page, setPage] = useState(1);
  const { data, loading, error } = useFetch(() => api.get('/orders', { page, limit: 8 }), [page]);
  return (
    <div className="stack">
      <h2 className="title-md">Histórico de pedidos</h2>
      {loading && <div className="skeleton" style={{ height: 140 }} />}
      {error && <div className="alert alert-error">{error}</div>}
      {data?.items.length === 0 && <EmptyState icon={Package} title="Você ainda não fez pedidos" action={<Link to="/catalogo" className="btn btn-sm">Começar a comprar</Link>} />}
      {data?.items.map((o) => (
        <article className="order-card" key={o.id}>
          <div className="order-card-head">
            <div><strong>{o.number}</strong><div className="muted" style={{ fontSize: 12.5 }}>{dateTime(o.created_at)}</div></div>
            <StatusPill status={o.status} />
            <strong>{money(o.total)}</strong>
          </div>
          <div className="order-card-body">
            <div className="thumbs">{o.items.slice(0, 5).map((i) => <img key={i.id} src={i.image || ''} alt={i.name} title={i.name} />)}</div>
            <span className="muted" style={{ fontSize: 13 }}>{o.items.reduce((n, i) => n + i.quantity, 0)} item(ns)</span>
            <Link to={`/conta/pedidos/${o.id}`} className="link-arrow" style={{ alignSelf: 'flex-start' }}>Ver detalhes</Link>
          </div>
        </article>
      ))}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </div>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const { data: o, loading, error } = useFetch(() => api.get(`/orders/${id}`).then((r) => r.item), [id]);
  useDocumentTitle(o ? `Pedido ${o.number}` : 'Pedido');
  if (loading) return <div className="skeleton" style={{ height: 300 }} />;
  if (error) return <div className="alert alert-error">{error}</div>;
  const step = STATUS_FLOW.indexOf(o.status);
  return (
    <div className="stack">
      <Link to="/conta/pedidos" className="link-arrow" style={{ alignSelf: 'flex-start' }}>← Voltar</Link>
      <div className="row-gap" style={{ justifyContent: 'space-between' }}>
        <div><h2 className="title-md">Pedido {o.number}</h2><span className="muted">{dateTime(o.created_at)}</span></div>
        <StatusPill status={o.status} />
      </div>
      {o.status !== 'cancelado' ? (
        <div className="timeline" aria-label="Andamento do pedido">
          {STATUS_FLOW.map((s, i) => <div key={s} className={i <= step ? 'done' : ''}>{['Aguardando', 'Pago', 'Preparo', 'Enviado', 'Entregue'][i]}</div>)}
        </div>
      ) : <div className="alert alert-error">Este pedido foi cancelado.</div>}
      {o.tracking_code && <div className="alert alert-info">Código de rastreio: <strong>{o.tracking_code}</strong></div>}

      <div className="panel" style={{ borderRadius: 0 }}>
        <h3>Itens</h3>
        {o.items.map((i) => (
          <div className="mini-line" key={i.id}>
            <img src={i.image || ''} alt="" />
            <div><strong style={{ fontWeight: 600 }}>{i.name}</strong><div className="muted" style={{ fontSize: 12.5 }}>{i.color} · {i.size} · {money(i.unit_price)} × {i.quantity}</div></div>
            <strong>{money(i.total)}</strong>
          </div>
        ))}
        <div className="totals" style={{ marginTop: 12 }}>
          <div className="row"><span>Subtotal</span><span>{money(o.subtotal)}</span></div>
          {o.discount > 0 && <div className="row discount"><span>Desconto {o.coupon_code && `(${o.coupon_code})`}</span><span>− {money(o.discount)}</span></div>}
          <div className="row"><span>Frete</span><span>{o.shipping ? money(o.shipping) : 'Grátis'}</span></div>
          <div className="row total"><span>Total</span><span>{money(o.total)}</span></div>
        </div>
      </div>

      <div className="cards-grid">
        <div className="address-card"><strong>Entrega</strong><span>{o.customer_name}</span><span>{o.ship_street}, {o.ship_number}{o.ship_complement ? ` — ${o.ship_complement}` : ''}</span><span>{o.ship_district} · {o.ship_city}/{o.ship_state}</span><span>CEP {maskCep(o.ship_zip)}</span></div>
        <div className="address-card"><strong>Pagamento</strong><span>{PAYMENT_LABELS[o.payment_method] || o.payment_method}</span><span className="muted">Confirmado manualmente pela loja.</span></div>
      </div>

      <div className="panel" style={{ borderRadius: 0 }}>
        <h3>Histórico</h3>
        <ul className="history">{[...o.history].reverse().map((h, i) => <li key={i}><strong>{h.status_label}</strong>{h.note && <span> — {h.note}</span>}<time>{dateTime(h.created_at)}</time></li>)}</ul>
      </div>
    </div>
  );
}

const blank = { label: '', recipient: '', zip: '', street: '', number: '', complement: '', district: '', city: '', state: '', is_default: false };

export function Addresses() {
  useDocumentTitle('Endereços');
  const toast = useToast();
  const { data, loading, reload } = useFetch(() => api.get('/addresses').then((r) => r.items), []);
  const [editing, setEditing] = useState(null);
  const [remove, setRemove] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setEditing((a) => ({ ...a, [k]: v }));

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErrors({});
    try {
      const body = { ...editing, label: editing.label || undefined, complement: editing.complement || undefined };
      if (editing.id) await api.put(`/addresses/${editing.id}`, body); else await api.post('/addresses', body);
      toast.success('Endereço salvo.'); setEditing(null); reload();
    } catch (err) {
      toast.error(err.message);
      if (err.details) setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
    }
    setBusy(false);
  };
  const doRemove = async () => {
    setBusy(true);
    try { await api.delete(`/addresses/${remove.id}`); toast.success('Endereço removido.'); setRemove(null); reload(); } catch (err) { toast.error(err.message); }
    setBusy(false);
  };

  const f = (k, label, props = {}) => (
    <Field label={label} error={errors[k]} htmlFor={`a-${k}`}><input id={`a-${k}`} className="input" required={props.required !== false} value={editing[k]} onChange={(e) => set(k, props.mask ? props.mask(e.target.value) : e.target.value)} /></Field>
  );

  return (
    <div className="stack">
      <div className="row-gap" style={{ justifyContent: 'space-between' }}>
        <h2 className="title-md">Endereços cadastrados</h2>
        <button className="btn btn-sm" onClick={() => setEditing({ ...blank })}><Plus size={14} /> Novo endereço</button>
      </div>
      {loading && <div className="skeleton" style={{ height: 120 }} />}
      {data?.length === 0 && <EmptyState icon={MapPin} title="Nenhum endereço salvo" text="Salve um endereço para agilizar suas próximas compras." />}
      <div className="cards-grid">
        {data?.map((a) => (
          <div key={a.id} className={`address-card ${a.is_default ? 'default' : ''}`}>
            <div className="row-gap" style={{ justifyContent: 'space-between' }}><strong>{a.label || 'Endereço'}</strong>{a.is_default && <span className="badge">Padrão</span>}</div>
            <span>{a.recipient}</span>
            <span>{a.street}, {a.number}{a.complement ? ` — ${a.complement}` : ''}</span>
            <span>{a.district} · {a.city}/{a.state} · CEP {maskCep(a.zip)}</span>
            <div className="row-gap" style={{ marginTop: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setEditing({ ...a, zip: maskCep(a.zip), complement: a.complement || '', label: a.label || '' })}><Pencil size={13} /> Editar</button>
              <button className="remove-btn" onClick={() => setRemove(a)}><Trash2 size={14} /> Excluir</button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} label="Endereço">
        {editing && (
          <form className="stack" onSubmit={save}>
            <h2 className="title-md" aria-hidden>{editing.id ? 'Editar endereço' : 'Novo endereço'}</h2>
            <div className="form-grid cols-2">{f('label', 'Apelido (ex.: Casa)', { required: false })}{f('recipient', 'Destinatário')}</div>
            <div className="form-grid cols-3">
              {f('zip', 'CEP', { mask: maskCep })}
              <div style={{ gridColumn: 'span 2' }}>{f('street', 'Rua / Avenida')}</div>
              {f('number', 'Número')}{f('complement', 'Complemento', { required: false })}{f('district', 'Bairro')}
              {f('city', 'Cidade')}
              <Field label="Estado" htmlFor="a-state" error={errors.state}><select id="a-state" className="select" required value={editing.state} onChange={(e) => set('state', e.target.value)}><option value="">UF</option>{UF.map((u) => <option key={u}>{u}</option>)}</select></Field>
            </div>
            <label className="check"><input type="checkbox" checked={editing.is_default} onChange={(e) => set('is_default', e.target.checked)} /> Definir como endereço padrão</label>
            <button className="btn" disabled={busy}>{busy ? <Spinner /> : 'Salvar endereço'}</button>
          </form>
        )}
      </Modal>
      <ConfirmDialog open={!!remove} title="Excluir endereço?" text="Esta ação não pode ser desfeita." confirmLabel="Excluir" danger busy={busy} onConfirm={doRemove} onCancel={() => setRemove(null)} />
    </div>
  );
}

export function Favorites() {
  useDocumentTitle('Favoritos');
  const { favIds } = useStore();
  const { data, loading } = useFetch(() => api.get('/favorites'), [favIds.length]);
  return (
    <div className="stack">
      <h2 className="title-md">Produtos favoritos</h2>
      {loading && !data && <div className="skeleton" style={{ height: 200 }} />}
      {data?.items.length === 0 && <EmptyState icon={Heart} title="Nenhum favorito ainda" text="Toque no coração de um produto para salvá-lo aqui." action={<Link to="/catalogo" className="btn btn-sm">Explorar produtos</Link>} />}
      <div className="product-grid">{data?.items.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div>
    </div>
  );
}

export function Password() {
  useDocumentTitle('Alterar senha');
  const toast = useToast();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (form.new_password !== form.confirm) { setError('A confirmação não confere com a nova senha.'); return; }
    setBusy(true);
    try {
      await api.put('/auth/password', { current_password: form.current_password, new_password: form.new_password });
      toast.success('Senha alterada com sucesso.'); setForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) { setError(err.message); }
    setBusy(false);
  };
  return (
    <form className="stack" onSubmit={submit} style={{ maxWidth: 460 }}>
      <h2 className="title-md">Alterar senha</h2>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <Field label="Senha atual" htmlFor="pw0"><input id="pw0" className="input" type="password" autoComplete="current-password" required value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} /></Field>
      <Field label="Nova senha" htmlFor="pw1" hint="Mínimo de 8 caracteres."><input id="pw1" className="input" type="password" autoComplete="new-password" minLength={8} required value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} /></Field>
      <Field label="Confirmar nova senha" htmlFor="pw2"><input id="pw2" className="input" type="password" autoComplete="new-password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} /></Field>
      <button className="btn" style={{ alignSelf: 'flex-start' }} disabled={busy}>{busy ? <Spinner /> : 'Atualizar senha'}</button>
    </form>
  );
}
