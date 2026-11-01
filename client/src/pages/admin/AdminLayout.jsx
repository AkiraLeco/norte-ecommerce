import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Shirt, Tags, ShoppingBag, Boxes, TicketPercent, Users, Settings, Menu, X, LogOut, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';

const LINKS = [
  ['/admin', 'Dashboard', LayoutDashboard, true],
  ['/admin/produtos', 'Produtos', Shirt],
  ['/admin/categorias', 'Categorias', Tags],
  ['/admin/pedidos', 'Pedidos', ShoppingBag],
  ['/admin/estoque', 'Estoque', Boxes],
  ['/admin/cupons', 'Cupons', TicketPercent],
  ['/admin/clientes', 'Clientes', Users],
  ['/admin/configuracoes', 'Configurações', Settings],
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { settings } = useStore();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => { setOpen(false); window.scrollTo({ top: 0 }); }, [pathname]);

  return (
    <div className="admin">
      <header className="admin-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button className="icon-btn admin-menu-btn" style={{ color: '#fff' }} onClick={() => setOpen((o) => !o)} aria-label="Menu administrativo" aria-expanded={open}>{open ? <X /> : <Menu />}</button>
          <Link to="/admin" className="logo" style={{ paddingLeft: 0 }}>{settings.store_name}</Link>
          <span className="badge badge-new">Admin</span>
        </div>
        <div className="row-gap" style={{ gap: 6 }}>
          <span style={{ fontSize: 13, opacity: 0.75 }} className="admin-user">{user.name}</span>
          <Link to="/" className="icon-btn" style={{ color: '#fff' }} aria-label="Ver loja" title="Ver loja"><Store size={19} /></Link>
          <button className="icon-btn" style={{ color: '#fff' }} aria-label="Sair" title="Sair" onClick={() => { logout(); navigate('/'); }}><LogOut size={19} /></button>
        </div>
      </header>
      <nav className={`admin-side ${open ? 'open' : ''}`} aria-label="Administração">
        {LINKS.map(([to, label, Icon, end]) => <NavLink key={to} to={to} end={end}><Icon size={18} /> {label}</NavLink>)}
      </nav>
      <main className="admin-main"><Outlet /></main>
    </div>
  );
}
