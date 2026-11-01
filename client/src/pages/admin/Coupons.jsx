import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useDocumentTitle, useFetch } from '../../hooks/hooks.js';
import { date, fromCents, money, toCents } from '../../services/format.js';
import { ConfirmDialog, EmptyState, Field, Modal, Spinner } from '../../components/ui.jsx';

const BLANK = { code: '', type: 'percent', value: '10', min_purchase: '', max_uses: '', expires_at: '', active: true };

export default function Coupons() {
  useDocumentTitle('Cupons — Admin');
  const toast = useToast();
  const { data, loading, reload } = useFetch(() => api.get('/coupons').then((r) => r.items), []);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const open = (c) => {
    setError('');
    setEdit(c ? { ...c, value: c.type === 'fixed' ? fromCents(c.value) : String(c.value), min_purchase: c.min_purchase ? fromCents(c.min_purchase) : '', max_uses: c.max_uses ?? '', expires_at: c.expires_at || '' } : { ...BLANK });
  };
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const body = {
        code: edit.code.trim(), type: edit.type, value: edit.type === 'fixed' ? toCents(edit.value) : Number(edit.value),
        min_purchase: toCents(edit.min_purchase) || 0, max_uses: edit.max_uses === '' ? null : Number(edit.max_uses), expires_at: edit.expires_at || null, active: edit.active,
      };
      await (edit.id ? api.put(`/coupons/${edit.id}`, body) : api.post('/coupons', body));
      toast.success('Cupom salvo.'); setEdit(null); reload();
    } catch (err) { setError(err.message); }
    setBusy(false);
  };
  const remove = async () => {
    setBusy(true);
    try { await api.delete(`/coupons/${del.id}`); toast.success('Cupom excluído.'); setDel(null); reload(); } catch (e) { toast.error(e.message); }
    setBusy(false);
  };
  const state = (c) => {
    if (!c.active) return ['', 'Inativo'];
    if (c.expires_at && new Date(`${c.expires_at}T23:59:59`) < new Date()) return ['pill-danger', 'Expirado'];
    if (c.max_uses != null && c.used_count >= c.max_uses) return ['pill-warn', 'Esgotado'];
    return ['pill-ok', 'Ativo'];
  };

  return (
    <>
      <div className="admin-title"><h1>Cupons</h1><button className="btn btn-sm" onClick={() => open(null)}><Plus size={15} /> Novo cupom</button></div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Código</th><th>Desconto</th><th className="num">Compra mínima</th><th>Usos</th><th>Validade</th><th>Status</th><th /></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7}><div className="skeleton" style={{ height: 40 }} /></td></tr>}
            {data?.map((c) => {
              const [cls, label] = state(c);
              return (
                <tr key={c.id}>
                  <td><b style={{ letterSpacing: '0.08em' }}>{c.code.toUpperCase()}</b></td>
                  <td>{c.type === 'percent' ? `${c.value}%` : money(c.value)}</td>
                  <td className="num">{c.min_purchase ? money(c.min_purchase) : '—'}</td>
                  <td>{c.used_count}{c.max_uses != null ? ` / ${c.max_uses}` : ' / ∞'}</td>
                  <td>{c.expires_at ? date(`${c.expires_at}T12:00:00`) : 'Sem validade'}</td>
                  <td><span className={`pill ${cls}`}>{label}</span></td>
                  <td className="actions">
                    <button className="icon-btn" onClick={() => open(c)} aria-label={`Editar ${c.code}`}><Pencil size={17} /></button>
                    <button className="icon-btn" onClick={() => setDel(c)} aria-label={`Excluir ${c.code}`}><Trash2 size={17} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && data?.length === 0 && <EmptyState title="Nenhum cupom criado" />}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} label="Cupom">
        {edit && (
          <form className="stack" onSubmit={save}>
            <h2 className="title-md" aria-hidden>{edit.id ? 'Editar cupom' : 'Novo cupom'}</h2>
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <Field label="Código" htmlFor="cp-code"><input id="cp-code" className="input" required style={{ textTransform: 'uppercase' }} value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })} data-autofocus /></Field>
            <div className="form-grid cols-2">
              <Field label="Tipo" htmlFor="cp-type"><select id="cp-type" className="select" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })}><option value="percent">Percentual (%)</option><option value="fixed">Valor fixo (R$)</option></select></Field>
              <Field label={edit.type === 'percent' ? 'Percentual' : 'Valor (R$)'} htmlFor="cp-val"><input id="cp-val" className="input" inputMode="decimal" required value={edit.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })} /></Field>
              <Field label="Compra mínima (R$)" htmlFor="cp-min"><input id="cp-min" className="input" inputMode="decimal" placeholder="Sem mínimo" value={edit.min_purchase} onChange={(e) => setEdit({ ...edit, min_purchase: e.target.value })} /></Field>
              <Field label="Limite de utilizações" htmlFor="cp-max"><input id="cp-max" className="input" type="number" min="1" placeholder="Ilimitado" value={edit.max_uses} onChange={(e) => setEdit({ ...edit, max_uses: e.target.value })} /></Field>
            </div>
            <Field label="Válido até" htmlFor="cp-exp"><input id="cp-exp" className="input" type="date" value={edit.expires_at} onChange={(e) => setEdit({ ...edit, expires_at: e.target.value })} /></Field>
            <label className="check"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Cupom ativo</label>
            <button className="btn" disabled={busy}>{busy ? <Spinner /> : 'Salvar cupom'}</button>
          </form>
        )}
      </Modal>
      <ConfirmDialog open={!!del} title="Excluir cupom?" text={`O cupom ${del?.code} deixará de funcionar. Pedidos que já o usaram são preservados.`} confirmLabel="Excluir" danger busy={busy} onConfirm={remove} onCancel={() => setDel(null)} />
    </>
  );
}
