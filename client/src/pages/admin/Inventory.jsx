import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Check } from 'lucide-react';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useDebounce, useDocumentTitle, useFetch } from '../../hooks/hooks.js';
import { dateTime } from '../../services/format.js';
import { EmptyState, Spinner } from '../../components/ui.jsx';

function Row({ item, onSaved }) {
  const toast = useToast();
  const [qty, setQty] = useState(item.quantity);
  const [min, setMin] = useState(item.low_stock_threshold);
  const [busy, setBusy] = useState(false);
  const dirty = Number(qty) !== item.quantity || Number(min) !== item.low_stock_threshold;
  const save = async () => {
    setBusy(true);
    try { await api.put(`/inventory/${item.id}`, { quantity: Number(qty), low_stock_threshold: Number(min) }); toast.success('Estoque atualizado.'); onSaved(); } catch (e) { toast.error(e.message); }
    setBusy(false);
  };
  const status = item.quantity === 0 ? ['pill-danger', 'Esgotado'] : item.quantity <= item.low_stock_threshold ? ['pill-warn', 'Baixo'] : ['pill-ok', 'Ok'];
  return (
    <tr>
      <td><b>{item.product_name}</b><br /><small className="muted">{item.sku}</small></td>
      <td><span className="swatch" style={{ background: item.hex, display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />{item.color}</td>
      <td>{item.size}</td>
      <td><span className={`pill ${status[0]}`}>{status[1]}</span></td>
      <td><input type="number" min="0" className="input" style={{ width: 90, minHeight: 38 }} aria-label={`Quantidade ${item.product_name} ${item.color} ${item.size}`} value={qty} onChange={(e) => setQty(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && dirty && save()} /></td>
      <td><input type="number" min="0" className="input" style={{ width: 80, minHeight: 38 }} aria-label="Alerta de estoque baixo" value={min} onChange={(e) => setMin(e.target.value)} /></td>
      <td className="muted">{dateTime(item.updated_at)}</td>
      <td className="actions"><button className="btn btn-sm" disabled={!dirty || busy} onClick={save}>{busy ? <Spinner /> : <><Check size={14} /> Salvar</>}</button></td>
    </tr>
  );
}

export default function Inventory() {
  useDocumentTitle('Estoque — Admin');
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const low = params.get('low') === '1';
  const { data, loading, error, reload } = useFetch(() => api.get('/inventory', { q: dq, low: low ? 1 : '' }), [dq, low]);

  return (
    <>
      <div className="admin-title"><h1>Estoque por variação</h1></div>
      <div className="filters-bar">
        <div className="grow" style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--muted)' }} />
          <input className="input" style={{ paddingLeft: 40, width: '100%' }} placeholder="Produto ou SKU" aria-label="Buscar no estoque" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="check"><input type="checkbox" checked={low} onChange={(e) => setParams(e.target.checked ? { low: '1' } : {})} /> Somente estoque baixo/esgotado</label>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="table-wrap">
        <table className="table" style={{ minWidth: 820 }}>
          <thead><tr><th>Produto</th><th>Cor</th><th>Tamanho</th><th>Situação</th><th>Quantidade</th><th>Alerta ≤</th><th>Atualizado</th><th /></tr></thead>
          <tbody>
            {loading && Array.from({ length: 6 }, (_, i) => <tr key={i}><td colSpan={8}><div className="skeleton" style={{ height: 36 }} /></td></tr>)}
            {!loading && data?.items.map((it) => <Row key={`${it.id}-${it.quantity}-${it.low_stock_threshold}`} item={it} onSaved={reload} />)}
          </tbody>
        </table>
        {!loading && data?.items.length === 0 && <EmptyState title="Nenhuma variação encontrada" />}
      </div>
      {data?.items.length >= 1000 && <p className="muted" style={{ marginTop: 10 }}>Mostrando as primeiras 1000 variações. Refine a busca.</p>}
    </>
  );
}
