import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, Star } from 'lucide-react';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useDebounce, useDocumentTitle, useFetch } from '../../hooks/hooks.js';
import { money } from '../../services/format.js';
import { ConfirmDialog, EmptyState, Pagination } from '../../components/ui.jsx';

export default function Products() {
  useDocumentTitle('Produtos — Admin');
  const toast = useToast();
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [page, setPage] = useState(1);
  const [active, setActive] = useState('');
  const [category, setCategory] = useState('');
  const [remove, setRemove] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data: cats } = useFetch(() => api.get('/categories', { admin: 1 }).then((r) => r.items), []);
  const { data, loading, error, reload } = useFetch(
    () => api.get('/products', { admin: 1, q: dq, page, limit: 15, active, category, sort: 'recent' }), [dq, page, active, category]);

  const toggle = async (p, field) => {
    try {
      const full = (await api.get(`/products/${p.id}`, { admin: 1 })).item;
      await api.put(`/products/${p.id}`, {
        ...full, [field]: !full[field], variants: full.variants.map((v) => ({ size_id: v.size_id, color_id: v.color_id, quantity: v.stock, low_stock_threshold: v.low_stock_threshold, active: !!v.active })),
      });
      reload();
    } catch (e) { toast.error(e.message); }
  };
  const doRemove = async () => {
    setBusy(true);
    try { await api.delete(`/products/${remove.id}`); toast.success('Produto excluído.'); setRemove(null); reload(); } catch (e) { toast.error(e.message); }
    setBusy(false);
  };

  return (
    <>
      <div className="admin-title"><h1>Produtos</h1><Link to="/admin/produtos/novo" className="btn btn-sm"><Plus size={15} /> Novo produto</Link></div>
      <div className="filters-bar">
        <div className="grow" style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--muted)' }} />
          <input className="input" style={{ paddingLeft: 40, width: '100%' }} placeholder="Buscar por nome ou marca" aria-label="Buscar produtos" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <select className="select" aria-label="Categoria" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}><option value="">Todas as categorias</option>{cats?.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select>
        <select className="select" aria-label="Status" value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }}><option value="">Ativos e inativos</option><option value="1">Somente ativos</option><option value="0">Somente inativos</option></select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Produto</th><th>Categoria</th><th className="num">Preço</th><th className="num">Estoque</th><th>Ativo</th><th>Destaque</th><th /></tr></thead>
          <tbody>
            {loading && Array.from({ length: 5 }, (_, i) => <tr key={i}><td colSpan={7}><div className="skeleton" style={{ height: 40 }} /></td></tr>)}
            {!loading && data?.items.map((p) => (
              <tr key={p.id}>
                <td><div className="cell-product">{p.image ? <img className="thumb" src={p.image} alt="" /> : <div className="thumb skeleton" style={{ width: 44, height: 55 }} />}<div><b>{p.name}</b><small>{p.gender} {p.is_new && '· novo'}</small></div></div></td>
                <td>{p.category_name || <span className="muted">—</span>}</td>
                <td className="num">{p.on_sale ? <><s className="muted">{money(p.price)}</s><br /><strong>{money(p.sale_price)}</strong></> : money(p.price)}</td>
                <td className="num"><span className={`pill ${p.stock === 0 ? 'pill-danger' : p.stock <= 10 ? 'pill-warn' : ''}`}>{p.stock}</span></td>
                <td><label className="switch" title={p.active ? 'Desativar' : 'Ativar'}><input type="checkbox" checked={p.active} onChange={() => toggle(p, 'active')} aria-label={`Produto ativo: ${p.name}`} /><i /></label></td>
                <td><button className="icon-btn" onClick={() => toggle(p, 'featured')} aria-pressed={p.featured} aria-label={`Destaque: ${p.name}`}><Star size={18} fill={p.featured ? 'var(--accent)' : 'none'} color={p.featured ? 'var(--accent)' : 'currentColor'} /></button></td>
                <td className="actions">
                  <Link to={`/admin/produtos/${p.id}`} className="icon-btn" aria-label={`Editar ${p.name}`}><Pencil size={17} /></Link>
                  <button className="icon-btn" onClick={() => setRemove(p)} aria-label={`Excluir ${p.name}`}><Trash2 size={17} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && data?.items.length === 0 && <EmptyState title="Nenhum produto encontrado" action={<Link to="/admin/produtos/novo" className="btn btn-sm">Cadastrar produto</Link>} />}
      </div>
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
      <ConfirmDialog open={!!remove} title="Excluir produto?" text={`“${remove?.name}” e suas imagens, variações e estoque serão removidos. Pedidos antigos continuam preservados.`} confirmLabel="Excluir" danger busy={busy} onConfirm={doRemove} onCancel={() => setRemove(null)} />
    </>
  );
}
