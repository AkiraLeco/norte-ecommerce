import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye } from 'lucide-react';
import { api } from '../../services/api.js';
import { useDebounce, useDocumentTitle, useFetch } from '../../hooks/hooks.js';
import { dateTime, money, PAYMENT_LABELS, STATUS } from '../../services/format.js';
import { EmptyState, Pagination, StatusPill } from '../../components/ui.jsx';

export default function Orders() {
  useDocumentTitle('Pedidos — Admin');
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error } = useFetch(() => api.get('/orders', { scope: 'all', q: dq, status, page, limit: 15 }), [dq, status, page]);

  return (
    <>
      <div className="admin-title"><h1>Pedidos</h1></div>
      <div className="filters-bar">
        <div className="grow" style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--muted)' }} />
          <input className="input" style={{ paddingLeft: 40, width: '100%' }} placeholder="Número, cliente ou e-mail" aria-label="Buscar pedidos" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <select className="select" aria-label="Filtrar por status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Produtos</th><th>Pagamento</th><th>Status</th><th className="num">Valor</th><th /></tr></thead>
          <tbody>
            {loading && Array.from({ length: 5 }, (_, i) => <tr key={i}><td colSpan={8}><div className="skeleton" style={{ height: 36 }} /></td></tr>)}
            {!loading && data?.items.map((o) => (
              <tr key={o.id}>
                <td><Link className="text-link" to={`/admin/pedidos/${o.id}`}><b>{o.number}</b></Link></td>
                <td>{o.customer_name}<br /><small className="muted">{o.customer_email}</small></td>
                <td>{dateTime(o.created_at)}</td>
                <td><div className="thumbs">{o.items.slice(0, 3).map((i) => <img key={i.id} src={i.image || ''} alt={i.name} title={`${i.quantity}× ${i.name}`} style={{ width: 34 }} />)}{o.items.length > 3 && <span className="muted">+{o.items.length - 3}</span>}</div></td>
                <td>{PAYMENT_LABELS[o.payment_method] || o.payment_method}</td>
                <td><StatusPill status={o.status} /></td>
                <td className="num"><b>{money(o.total)}</b></td>
                <td className="actions"><Link to={`/admin/pedidos/${o.id}`} className="icon-btn" aria-label={`Ver pedido ${o.number}`}><Eye size={17} /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && data?.items.length === 0 && <EmptyState title="Nenhum pedido encontrado" />}
      </div>
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </>
  );
}
