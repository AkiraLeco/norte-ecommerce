import { Link } from 'react-router-dom';
import { DollarSign, ShoppingBag, Clock, CheckCircle2, Shirt, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { api } from '../../services/api.js';
import { useDocumentTitle, useFetch } from '../../hooks/hooks.js';
import { money, date } from '../../services/format.js';
import { StatusPill } from '../../components/ui.jsx';

function Kpi({ icon: Icon, label, value, sub, tone = '' }) {
  return (
    <div className={`kpi ${tone}`}>
      <div className="kpi-top"><span>{label}</span><span className="kpi-icon"><Icon size={17} /></span></div>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

function RevenueChart({ data }) {
  const W = 640, H = 220, pad = { l: 8, r: 8, t: 12, b: 28 };
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const bw = (W - pad.l - pad.r) / data.length;
  const ticks = [0, 0.5, 1];
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Faturamento dos últimos 14 dias">
      {ticks.map((t) => {
        const y = pad.t + (H - pad.t - pad.b) * (1 - t);
        return <g key={t}><line className="grid" x1={pad.l} x2={W - pad.r} y1={y} y2={y} /><text x={pad.l} y={y - 4}>{t ? money(max * t).replace(',00', '') : ''}</text></g>;
      })}
      {data.map((d, i) => {
        const h = ((H - pad.t - pad.b) * d.revenue) / max;
        const x = pad.l + i * bw + bw * 0.18;
        return (
          <g key={d.day}>
            <title>{`${date(d.day)}: ${money(d.revenue)} (${d.orders} pedido${d.orders === 1 ? '' : 's'})`}</title>
            <rect className="bar" x={x} y={H - pad.b - h} width={bw * 0.64} height={Math.max(h, d.revenue ? 2 : 0)} rx="2" />
            {(i % 2 === 0 || data.length < 8) && <text x={x + bw * 0.32} y={H - 10} textAnchor="middle">{d.day.slice(8)}/{d.day.slice(5, 7)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const { data, loading, error } = useFetch(() => api.get('/admin/dashboard'), []);
  if (loading) return <div className="stack"><div className="skeleton" style={{ height: 40, width: 220 }} /><div className="kpis">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton" style={{ height: 100 }} />)}</div></div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  const t = data.totals;
  const maxStatus = Math.max(...data.statusBreakdown.map((s) => s.n), 1);
  const maxUnits = Math.max(...data.topProducts.map((p) => p.units), 1);

  return (
    <>
      <div className="admin-title"><h1>Dashboard</h1><span className="muted">Visão geral da loja</span></div>
      <div className="kpis">
        <Kpi icon={DollarSign} label="Faturamento" value={money(t.revenue)} sub={`${money(t.revenue_pending)} aguardando pagamento`} tone="ok" />
        <Kpi icon={TrendingUp} label="Total de vendas" value={t.total_sales} sub="pedidos com pagamento confirmado" />
        <Kpi icon={ShoppingBag} label="Pedidos recebidos" value={t.orders_received} sub={`${t.orders_cancelled} cancelado(s)`} />
        <Kpi icon={Clock} label="Pedidos pendentes" value={t.orders_pending} sub="aguardando pagamento" tone={t.orders_pending ? 'warn' : ''} />
        <Kpi icon={CheckCircle2} label="Pedidos concluídos" value={t.orders_completed} sub="entregues" tone="ok" />
        <Kpi icon={Shirt} label="Produtos cadastrados" value={t.products} sub={`${t.products_active} ativos`} />
        <Kpi icon={AlertTriangle} label="Estoque baixo" value={t.low_stock_products} sub={`${t.low_stock_variants} variações no limite`} tone={t.low_stock_products ? 'warn' : ''} />
        <Kpi icon={Users} label="Clientes" value={t.customers} sub="contas cadastradas" />
      </div>

      <div className="dash-grid">
        <section className="panel"><h2>Faturamento — últimos 14 dias</h2><RevenueChart data={data.salesByDay} /></section>
        <section className="panel">
          <h2>Pedidos por status</h2>
          {data.statusBreakdown.length === 0 && <p className="muted">Sem pedidos ainda.</p>}
          {data.statusBreakdown.map((s) => (
            <div className="hbar" key={s.status}><span>{s.label}</span><div className="track"><i style={{ width: `${(s.n / maxStatus) * 100}%` }} /></div><strong>{s.n}</strong></div>
          ))}
        </section>
      </div>

      <div className="dash-grid even" style={{ marginTop: 16 }}>
        <section className="panel">
          <div className="panel-head"><h2>Produtos mais vendidos</h2><Link to="/admin/produtos" className="link-arrow">Produtos</Link></div>
          {data.topProducts.length === 0 && <p className="muted">Sem vendas ainda.</p>}
          {data.topProducts.map((p) => (
            <div className="list-row" key={p.name}>
              {p.image && <img src={p.image} alt="" />}
              <div className="grow"><b>{p.name}</b><div className="track" style={{ background: 'var(--gray)', height: 6, marginTop: 6, borderRadius: 3 }}><i style={{ display: 'block', height: '100%', width: `${(p.units / maxUnits) * 100}%`, background: 'var(--accent)', borderRadius: 3 }} /></div></div>
              <div style={{ textAlign: 'right' }}><strong>{p.units} un.</strong><div className="muted" style={{ fontSize: 12 }}>{money(p.revenue)}</div></div>
            </div>
          ))}
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Estoque baixo</h2><Link to="/admin/estoque?low=1" className="link-arrow">Gerenciar</Link></div>
          {data.lowStock.length === 0 && <p className="muted">Nenhum item com estoque baixo.</p>}
          {data.lowStock.map((l, i) => (
            <div className="list-row" key={i}>
              <div className="grow"><b>{l.name}</b><span className="muted" style={{ fontSize: 12.5 }}>{l.color} · {l.size}</span></div>
              <span className={`pill ${l.quantity === 0 ? 'pill-danger' : 'pill-warn'}`}>{l.quantity === 0 ? 'Esgotado' : `${l.quantity} un.`}</span>
            </div>
          ))}
        </section>
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-head"><h2>Pedidos recentes</h2><Link to="/admin/pedidos" className="link-arrow">Ver todos</Link></div>
        <div className="table-wrap" style={{ border: 0 }}>
          <table className="table">
            <thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Status</th><th className="num">Total</th></tr></thead>
            <tbody>
              {data.recentOrders.map((o) => (
                <tr key={o.id}><td><Link className="text-link" to={`/admin/pedidos/${o.id}`}>{o.number}</Link></td><td>{o.customer_name}</td><td>{date(o.created_at)}</td><td><StatusPill status={o.status} /></td><td className="num">{money(o.total)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
