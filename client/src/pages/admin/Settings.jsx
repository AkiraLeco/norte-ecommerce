import { useEffect, useState } from 'react';
import { Database, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { useDocumentTitle, useFetch } from '../../hooks/hooks.js';
import { fromCents, toCents } from '../../services/format.js';
import { ConfirmDialog, Field, Modal, Spinner } from '../../components/ui.jsx';

const SLOTS = { hero: 'Hero (topo da home)', promo: 'Banner promocional', category: 'Card de categoria' };
const BLANK_BANNER = { slot: 'promo', title: '', subtitle: '', cta_label: '', link: '', sort_order: 0, active: true, image: null, file: null };

function Banners() {
  const toast = useToast();
  const { data, reload } = useFetch(() => api.get('/banners', { admin: 1 }).then((r) => r.items), []);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const fd = new FormData();
      ['slot', 'title', 'subtitle', 'cta_label', 'link', 'sort_order', 'active'].forEach((k) => fd.append(k, edit[k] ?? ''));
      if (edit.file) fd.append('image', edit.file);
      await api.upload(edit.id ? 'PUT' : 'POST', edit.id ? `/admin/banners/${edit.id}` : '/admin/banners', fd);
      toast.success('Banner salvo.'); setEdit(null); reload();
    } catch (err) { setError(err.message); }
    setBusy(false);
  };
  const remove = async () => {
    setBusy(true);
    try { await api.delete(`/admin/banners/${del.id}`); toast.success('Banner excluído.'); setDel(null); reload(); } catch (e) { toast.error(e.message); }
    setBusy(false);
  };

  return (
    <section className="panel">
      <div className="panel-head"><h2>Banners e destaques da home</h2><button className="btn btn-sm" onClick={() => { setError(''); setEdit({ ...BLANK_BANNER }); }}><Plus size={14} /> Novo banner</button></div>
      <div className="img-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))' }}>
        {data?.map((b) => (
          <div className="img-tile" key={b.id}>
            {b.image ? <img src={b.image} alt="" style={{ aspectRatio: '16/10' }} /> : <div className="skeleton" style={{ aspectRatio: '16/10' }} />}
            <div style={{ padding: 10, fontSize: 13 }}>
              <b>{b.title}</b><div className="muted">{SLOTS[b.slot]}{!b.active && ' · inativo'}</div>
              <div className="row-gap" style={{ marginTop: 6 }}>
                <button className="icon-btn" onClick={() => { setError(''); setEdit({ ...BLANK_BANNER, ...b, subtitle: b.subtitle || '', cta_label: b.cta_label || '', link: b.link || '' }); }} aria-label={`Editar ${b.title}`}><Pencil size={16} /></button>
                <button className="icon-btn" onClick={() => setDel(b)} aria-label={`Excluir ${b.title}`}><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} label="Banner">
        {edit && (
          <form className="stack" onSubmit={save}>
            <h2 className="title-md" aria-hidden>{edit.id ? 'Editar banner' : 'Novo banner'}</h2>
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <Field label="Posição" htmlFor="b-slot"><select id="b-slot" className="select" value={edit.slot} onChange={(e) => setEdit({ ...edit, slot: e.target.value })}>{Object.entries(SLOTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Título" htmlFor="b-title"><input id="b-title" className="input" required value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
            <Field label="Subtítulo" htmlFor="b-sub"><input id="b-sub" className="input" value={edit.subtitle} onChange={(e) => setEdit({ ...edit, subtitle: e.target.value })} /></Field>
            <div className="form-grid cols-2">
              <Field label="Texto do botão" htmlFor="b-cta"><input id="b-cta" className="input" value={edit.cta_label} onChange={(e) => setEdit({ ...edit, cta_label: e.target.value })} /></Field>
              <Field label="Link (ex.: /catalogo?promocoes=1)" htmlFor="b-link"><input id="b-link" className="input" value={edit.link} onChange={(e) => setEdit({ ...edit, link: e.target.value })} /></Field>
            </div>
            <label className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }}><ImagePlus size={14} /> {edit.file ? edit.file.name : edit.image ? 'Trocar imagem' : 'Escolher imagem'}
              <input type="file" hidden accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => e.target.files[0] && setEdit({ ...edit, file: e.target.files[0] })} /></label>
            <label className="check"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Banner ativo</label>
            <button className="btn" disabled={busy}>{busy ? <Spinner /> : 'Salvar banner'}</button>
          </form>
        )}
      </Modal>
      <ConfirmDialog open={!!del} title="Excluir banner?" text="A imagem também será removida do servidor." confirmLabel="Excluir" danger busy={busy} onConfirm={remove} onCancel={() => setDel(null)} />
    </section>
  );
}

export default function Settings() {
  useDocumentTitle('Configurações — Admin');
  const toast = useToast();
  const { reloadSettings } = useStore();
  const { data, loading, error, reload } = useFetch(() => api.get('/admin/settings').then((r) => r.settings), []);
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);

  useEffect(() => {
    if (data) setS({ ...data, shipping_flat: fromCents(Number(data.shipping_flat)), shipping_free_min: fromCents(Number(data.shipping_free_min)) });
  }, [data]);
  const set = (k, v) => setS((x) => ({ ...x, [k]: v }));
  const setMethod = (i, patch) => set('payment_methods', s.payment_methods.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const { logo, ...rest } = s; // eslint-disable-line no-unused-vars
      await api.put('/admin/settings', { ...rest, shipping_flat: toCents(s.shipping_flat) ?? 0, shipping_free_min: toCents(s.shipping_free_min) ?? 0, installments_max: Number(s.installments_max) || 1 });
      toast.success('Configurações salvas.'); reloadSettings(); reload();
    } catch (err) { toast.error(err.message); }
    setBusy(false);
  };
  const uploadLogo = async (file) => {
    const fd = new FormData(); fd.append('logo', file);
    try { await api.upload('POST', '/admin/settings/logo', fd); toast.success('Logotipo atualizado.'); reloadSettings(); reload(); } catch (err) { toast.error(err.message); }
  };
  const removeLogo = async () => {
    try { await api.delete('/admin/settings/logo'); toast.success('Logotipo removido.'); reloadSettings(); reload(); } catch (err) { toast.error(err.message); }
  };
  const backup = async () => {
    setBackupBusy(true);
    try { const r = await api.post('/admin/backup'); toast.success(`Backup criado: ${r.file}`); } catch (err) { toast.error(err.message); }
    setBackupBusy(false);
  };

  if (loading || !s) return <div className="skeleton" style={{ height: 400 }} />;
  if (error) return <div className="alert alert-error">{error}</div>;

  const text = (k, label, props = {}) => <Field label={label} htmlFor={`s-${k}`}><input id={`s-${k}`} className="input" value={s[k] ?? ''} onChange={(e) => set(k, e.target.value)} {...props} /></Field>;

  return (
    <>
      <div className="admin-title"><h1>Configurações</h1></div>
      <form className="stack" onSubmit={save}>
        <section className="panel stack">
          <h2>Identidade da loja</h2>
          <div className="form-grid cols-2">{text('store_name', 'Nome da loja', { required: true })}</div>
          <Field label="Descrição" htmlFor="s-desc"><textarea id="s-desc" className="textarea" rows={2} value={s.store_description} onChange={(e) => set('store_description', e.target.value)} /></Field>
          <div>
            <span className="label">Logotipo</span>
            <div className="row-gap" style={{ marginTop: 8 }}>
              {data.logo ? <img className="logo-preview" src={data.logo} alt="Logotipo atual" /> : <span className="muted">Usando o nome da loja como logotipo.</span>}
              <label className="btn btn-outline btn-sm"><ImagePlus size={14} /> Enviar logotipo<input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files[0] && uploadLogo(e.target.files[0])} /></label>
              {data.logo && <button type="button" className="remove-btn" onClick={removeLogo}>Remover</button>}
            </div>
          </div>
        </section>

        <section className="panel stack">
          <h2>Contato e redes sociais</h2>
          <div className="form-grid cols-2">
            {text('phone', 'Telefone')}{text('whatsapp', 'WhatsApp (com DDI, ex.: 5511999999999)')}{text('email', 'E-mail', { type: 'email' })}{text('address', 'Endereço')}
            {text('instagram', 'Instagram (URL)')}{text('facebook', 'Facebook (URL)')}{text('tiktok', 'TikTok (URL)')}
          </div>
        </section>

        <section className="panel stack">
          <h2>Frete e parcelamento</h2>
          <div className="form-grid cols-2">
            {text('shipping_flat', 'Frete fixo (R$)', { inputMode: 'decimal' })}
            {text('shipping_free_min', 'Frete grátis acima de (R$) — 0 desativa', { inputMode: 'decimal' })}
            {text('shipping_days', 'Prazo de entrega exibido')}
            {text('installments_max', 'Parcelas sem juros (demonstrativo)', { type: 'number', min: 1, max: 12 })}
          </div>
        </section>

        <section className="panel stack">
          <h2>Formas de pagamento</h2>
          <div className="alert alert-info">Sem gateway integrado, só ofereça métodos confirmados manualmente por você. A estrutura (identificador + rótulo) está pronta para futura integração.</div>
          {s.payment_methods.map((m, i) => (
            <div key={m.id} className="panel stack" style={{ padding: 14 }}>
              <div className="row-gap" style={{ justifyContent: 'space-between' }}>
                <b>{m.id}</b>
                <label className="row-gap" style={{ cursor: 'pointer' }}><span>{m.enabled ? 'Habilitado' : 'Desabilitado'}</span><span className="switch"><input type="checkbox" checked={m.enabled} onChange={(e) => setMethod(i, { enabled: e.target.checked })} aria-label={`Habilitar ${m.label}`} /><i /></span></label>
              </div>
              <div className="form-grid cols-2">
                <Field label="Nome exibido" htmlFor={`pm-l-${i}`}><input id={`pm-l-${i}`} className="input" value={m.label} onChange={(e) => setMethod(i, { label: e.target.value })} /></Field>
                <Field label="Instruções" htmlFor={`pm-d-${i}`}><input id={`pm-d-${i}`} className="input" value={m.description} onChange={(e) => setMethod(i, { description: e.target.value })} /></Field>
              </div>
            </div>
          ))}
        </section>

        <section className="panel stack">
          <h2>Informações institucionais</h2>
          <Field label="Sobre a loja" htmlFor="s-about"><textarea id="s-about" className="textarea" rows={3} value={s.about} onChange={(e) => set('about', e.target.value)} /></Field>
          <Field label="Política de trocas e devoluções" htmlFor="s-policy"><textarea id="s-policy" className="textarea" rows={3} value={s.policy_exchange} onChange={(e) => set('policy_exchange', e.target.value)} /></Field>
        </section>

        <div><button className="btn" disabled={busy}>{busy ? <Spinner /> : 'Salvar configurações'}</button></div>
      </form>

      <div className="stack" style={{ marginTop: 16 }}>
        <Banners />
        <section className="panel stack">
          <h2>Banco de dados local (SQLite)</h2>
          <p className="muted">Gera uma cópia consistente do arquivo <code>loja.db</code> em <code>server/database/backups</code>. Os 20 backups mais recentes são mantidos.</p>
          <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={backup} disabled={backupBusy}>{backupBusy ? <Spinner /> : <><Database size={14} /> Criar backup agora</>}</button>
        </section>
      </div>
    </>
  );
}
