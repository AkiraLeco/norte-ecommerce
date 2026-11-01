import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/hooks.js';
import { maskCep, maskCpf, maskPhone, money, UF } from '../services/format.js';
import { Field, Spinner } from '../components/ui.jsx';
import { CouponBox, Totals, saveCoupon, useCouponSummary } from './Cart.jsx';

const empty = { customer_name: '', customer_email: '', customer_phone: '', customer_cpf: '', zip: '', street: '', number: '', complement: '', district: '', city: '', state: '', payment_method: '', notes: '' };

export default function Checkout() {
  useDocumentTitle('Finalizar compra');
  const { user } = useAuth();
  const { items, subtotal, loading, reset } = useCart();
  const { settings } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const cs = useCouponSummary();
  const [form, setForm] = useState({ ...empty, customer_name: user.name, customer_email: user.email, customer_phone: maskPhone(user.phone || ''), customer_cpf: maskCpf(user.cpf || '') });
  const [errors, setErrors] = useState({});
  const [addresses, setAddresses] = useState([]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const placed = useRef(false); // evita redirecionar ao carrinho vazio depois de concluir o pedido

  useEffect(() => {
    api.get('/addresses').then((r) => {
      setAddresses(r.items);
      const d = r.items.find((a) => a.is_default) || r.items[0];
      if (d) fillAddress(d);
    }).catch(() => {});
  }, []); // eslint-disable-line
  useEffect(() => { if (!form.payment_method && settings.payment_methods[0]) set('payment_method', settings.payment_methods[0].id); }, [settings.payment_methods]); // eslint-disable-line

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const fillAddress = (a) => setForm((f) => ({ ...f, zip: maskCep(a.zip), street: a.street, number: a.number, complement: a.complement || '', district: a.district, city: a.city, state: a.state }));

  if (!loading && items.length === 0 && !placed.current) return <Navigate to="/carrinho" replace />;
  const blocked = items.some((i) => !i.available || i.exceeds_stock);

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    setBusy(true);
    try {
      const { item } = await api.post('/orders', {
        customer_name: form.customer_name, customer_email: form.customer_email, customer_phone: form.customer_phone, customer_cpf: form.customer_cpf,
        shipping_address: { zip: form.zip, street: form.street, number: form.number, complement: form.complement, district: form.district, city: form.city, state: form.state },
        payment_method: form.payment_method, coupon_code: cs.coupon?.code, notes: form.notes,
      });
      placed.current = true;
      saveCoupon(null);
      reset();
      navigate(`/pedido/confirmado/${item.id}`, { replace: true });
    } catch (err) {
      if (err.details) setErrors(Object.fromEntries(err.details.map((d) => [d.field.replace('shipping_address.', ''), d.message])));
      setFormError(err.message);
      toast.error(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setBusy(false);
  };

  const input = (k, label, props = {}) => (
    <Field label={label} error={errors[k]} htmlFor={`f-${k}`}>
      <input id={`f-${k}`} className="input" value={form[k]} aria-invalid={!!errors[k]} onChange={(e) => set(k, props.mask ? props.mask(e.target.value) : e.target.value)} required={props.required !== false} {...props.attrs} />
    </Field>
  );

  return (
    <div className="container">
      <div className="page-head" style={{ borderBottom: 0 }}><h1 className="title-lg">Finalizar compra</h1></div>
      <form className="checkout" onSubmit={submit} noValidate={false}>
        <div className="stack" style={{ gap: 20 }}>
          {formError && <div className="alert alert-error" role="alert">{formError}</div>}

          <section className="form-card">
            <h2><span className="step">1</span> Seus dados</h2>
            <div className="form-grid cols-2">
              {input('customer_name', 'Nome completo', { attrs: { autoComplete: 'name' } })}
              {input('customer_email', 'E-mail', { attrs: { type: 'email', autoComplete: 'email' } })}
              {input('customer_phone', 'Telefone', { mask: maskPhone, attrs: { inputMode: 'tel', autoComplete: 'tel', placeholder: '(11) 91234-5678' } })}
              {input('customer_cpf', 'CPF', { mask: maskCpf, attrs: { inputMode: 'numeric', placeholder: '000.000.000-00' } })}
            </div>
            <p className="field-hint">O CPF é necessário para emissão da nota fiscal e é armazenado apenas no seu pedido.</p>
          </section>

          <section className="form-card">
            <h2><span className="step">2</span> Endereço de entrega</h2>
            {addresses.length > 0 && (
              <Field label="Usar endereço salvo" htmlFor="saved-addr">
                <select id="saved-addr" className="select" defaultValue={addresses.find((a) => a.is_default)?.id || addresses[0].id} onChange={(e) => { const a = addresses.find((x) => x.id === Number(e.target.value)); if (a) fillAddress(a); }}>
                  {addresses.map((a) => <option key={a.id} value={a.id}>{a.label || 'Endereço'} — {a.street}, {a.number}</option>)}
                </select>
              </Field>
            )}
            <div className="form-grid cols-3">
              {input('zip', 'CEP', { mask: maskCep, attrs: { inputMode: 'numeric', autoComplete: 'postal-code', placeholder: '00000-000' } })}
              <div style={{ gridColumn: 'span 2' }}>{input('street', 'Rua / Avenida', { attrs: { autoComplete: 'address-line1' } })}</div>
              {input('number', 'Número')}
              {input('complement', 'Complemento', { required: false })}
              {input('district', 'Bairro')}
              {input('city', 'Cidade', { attrs: { autoComplete: 'address-level2' } })}
              <Field label="Estado" error={errors.state} htmlFor="f-state">
                <select id="f-state" className="select" required value={form.state} onChange={(e) => set('state', e.target.value)}>
                  <option value="">UF</option>{UF.map((u) => <option key={u}>{u}</option>)}
                </select>
              </Field>
            </div>
          </section>

          <section className="form-card">
            <h2><span className="step">3</span> Pagamento</h2>
            {settings.payment_methods.length === 0 ? (
              <div className="alert alert-warn">Nenhuma forma de pagamento está habilitada no momento. Entre em contato com a loja.</div>
            ) : (
              <div className="stack" role="radiogroup" aria-label="Forma de pagamento">
                {settings.payment_methods.map((m) => (
                  <label key={m.id} className={`radio-card ${form.payment_method === m.id ? 'on' : ''}`}>
                    <input type="radio" name="pay" checked={form.payment_method === m.id} onChange={() => set('payment_method', m.id)} />
                    <div><strong>{m.label}</strong><span>{m.description}</span></div>
                  </label>
                ))}
              </div>
            )}
            <div className="alert alert-info"><Info size={18} style={{ flex: 'none', marginTop: 2 }} /><span>Nenhum pagamento é processado automaticamente. Seu pedido ficará como <strong>“Aguardando pagamento”</strong> até a confirmação manual pela loja.</span></div>
            <Field label="Observações (opcional)" htmlFor="f-notes"><textarea id="f-notes" className="textarea" maxLength={500} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
          </section>
        </div>

        <aside className="stack" aria-label="Resumo da compra">
          <div className="summary-box">
            <h2 className="title-md">Resumo da compra</h2>
            <ul>
              {items.map((i) => (
                <li className="mini-line" key={i.id}>
                  <img src={i.image || ''} alt="" />
                  <div><strong style={{ fontWeight: 600 }}>{i.name}</strong><div className="muted" style={{ fontSize: 12 }}>{i.color} · {i.size} · Qtd {i.quantity}</div></div>
                  <span>{money(i.line_total)}</span>
                </li>
              ))}
            </ul>
            <CouponBox cs={cs} />
            <Totals subtotal={subtotal} cs={cs} />
            {settings.shipping_days && <p className="muted" style={{ fontSize: 12.5 }}>Prazo de entrega estimado: {settings.shipping_days}.</p>}
            {blocked && <div className="alert alert-warn">Há itens indisponíveis no carrinho. <Link className="text-link" to="/carrinho">Ajustar carrinho</Link></div>}
            <button className="btn btn-block" disabled={busy || blocked || !form.payment_method}>{busy ? <Spinner /> : `Confirmar pedido · ${money(cs.total)}`}</button>
            <p className="muted" style={{ fontSize: 12 }}>Os valores, o estoque e o cupom são revalidados no servidor ao confirmar.</p>
          </div>
        </aside>
      </form>
    </div>
  );
}
