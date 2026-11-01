import { useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useDebounce, useDocumentTitle, useFetch } from '../../hooks/hooks.js';
import { date, maskPhone, money } from '../../services/format.js';
import { EmptyState } from '../../components/ui.jsx';

export default function Customers() {
  useDocumentTitle('Clientes — Admin');
  const toast = useToast();
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const { data, loading, error, reload } = useFetch(() => api.get('/admin/customers', { q: dq }), [dq]);

  const toggle = async (c) => {
    try { await api.put(`/admin/customers/${c.id}/active`, { active: !c.active }); toast.success(c.active ? 'Conta desativada.' : 'Conta reativada.'); reload(); } catch (e) { toast.error(e.message); }
  };

  return (
    <>
      <div className="admin-title"><h1>Clientes</h1></div>
      <div className="filters-bar">
        <div className="grow" style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--muted)' }} />
          <input className="input" style={{ paddingLeft: 40, width: '100%' }} placeholder="Nome ou e-mail" aria-label="Buscar clientes" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Cliente</th><th>Telefone</th><th>Cadastro</th><th className="num">Pedidos</th><th className="num">Total gasto</th><th>Conta</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6}><div className="skeleton" style={{ height: 40 }} /></td></tr>}
            {data?.items.map((c) => (
              <tr key={c.id}>
                <td><b>{c.name}</b><br /><small className="muted">{c.email}</small></td>
                <td>{c.phone ? maskPhone(c.phone) : '—'}</td>
                <td>{date(c.created_at)}</td>
                <td className="num">{c.orders_count}</td>
                <td className="num">{money(c.total_spent)}</td>
                <td><label className="switch" title={c.active ? 'Desativar conta' : 'Reativar conta'}><input type="checkbox" checked={c.active} onChange={() => toggle(c)} aria-label={`Conta ativa: ${c.name}`} /><i /></label></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && data?.items.length === 0 && <EmptyState title="Nenhum cliente encontrado" />}
      </div>
    </>
  );
}
