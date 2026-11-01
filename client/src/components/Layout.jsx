import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Search, User, Heart, ShoppingBag, Menu, X, Instagram, Facebook, Music2, Phone, Mail, MapPin, MessageCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../services/api.js';
import { useDebounce } from '../hooks/hooks.js';
import { money } from '../services/format.js';
import CartDrawer from './CartParts.jsx';
import { Drawer } from './ui.jsx';

const NAV = [
  { to: '/', label: 'Início', end: true },
  { to: '/catalogo?genero=masculino', label: 'Masculino', match: 'genero=masculino' },
  { to: '/catalogo?genero=feminino', label: 'Feminino', match: 'genero=feminino' },
  { to: '/colecoes', label: 'Coleções' },
  { to: '/catalogo?novidades=1', label: 'Novidades', match: 'novidades=1' },
  { to: '/catalogo?promocoes=1', label: 'Promoções', match: 'promocoes=1', sale: true },
];

function NavItem({ item, onClick, mobile }) {
  const { pathname, search } = useLocation();
  const active = item.match ? pathname === '/catalogo' && search.includes(item.match) : item.end ? pathname === '/' : pathname.startsWith(item.to);
  if (mobile) return <Link to={item.to} onClick={onClick} style={item.sale ? { color: 'var(--danger)' } : undefined}>{item.label}</Link>;
  return <Link to={item.to} className={`nav-link ${active ? 'active' : ''} ${item.sale ? 'sale' : ''}`} aria-current={active ? 'page' : undefined}>{item.label}</Link>;
}

function SearchPanel({ open, onClose }) {
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const input = useRef(null);

  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 50); else { setQ(''); setResults([]); } }, [open]);
  useEffect(() => {
    if (dq.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    api.get('/products', { q: dq.trim(), limit: 6 }).then((r) => setResults(r.items)).catch(() => setResults([])).finally(() => setLoading(false));
  }, [dq]);

  const submit = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(`/catalogo?q=${encodeURIComponent(q.trim())}`);
    onClose();
  };

  return (
    <Drawer open={open} onClose={onClose} label="Pesquisar produtos" side="top">
      <div className="container">
        <form onSubmit={submit} role="search" className="search-input-wrap">
          <Search size={24} aria-hidden />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="O que você procura?" aria-label="Pesquisar produtos" />
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar pesquisa"><X size={22} /></button>
        </form>
        <div className="search-results" aria-live="polite">
          {loading && <p className="muted">Buscando…</p>}
          {!loading && dq.trim().length >= 2 && results.length === 0 && <p className="muted">Nenhum produto encontrado para “{dq}”.</p>}
          {results.map((p) => (
            <Link key={p.id} to={`/produto/${p.slug}`} className="search-item" onClick={onClose}>
              <img src={p.image || ''} alt="" />
              <div><strong style={{ fontWeight: 600 }}>{p.name}</strong><div className="muted" style={{ fontSize: 12 }}>{p.category_name}</div></div>
              <strong>{money(p.final_price)}</strong>
            </Link>
          ))}
          {results.length > 0 && <button className="link-arrow" style={{ justifySelf: 'start', marginTop: 8 }} onClick={submit}>Ver todos os resultados <ArrowRight size={14} /></button>}
        </div>
      </div>
    </Drawer>
  );
}

function Logo({ onClick }) {
  const { settings } = useStore();
  return (
    <Link to="/" className="logo" aria-label={`${settings.store_name} — página inicial`} onClick={onClick}>
      {settings.logo ? <img src={settings.logo} alt={settings.store_name} /> : settings.store_name}
    </Link>
  );
}

function Header() {
  const { user } = useAuth();
  const { count, openDrawer } = useCart();
  const { settings, favIds } = useStore();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { setMenu(false); setSearch(false); }, [pathname]);

  const freeMin = settings.shipping_free_min;
  return (
    <>
      {freeMin > 0 && <div className="announce">Frete grátis em compras acima de {money(freeMin)} · Troca facilitada em 30 dias</div>}
      <header className="header">
        <div className="container header-inner">
          <div className="header-left">
            <button className="icon-btn menu-toggle" onClick={() => setMenu(true)} aria-label="Abrir menu" aria-expanded={menu}><Menu size={22} /></button>
          </div>
          <Logo />
          <div className="header-actions">
            <button className="icon-btn" onClick={() => setSearch(true)} aria-label="Pesquisar"><Search size={20} /></button>
            <Link to={user ? '/conta' : '/entrar'} className="icon-btn" aria-label={user ? 'Minha conta' : 'Entrar'}><User size={20} /></Link>
            <Link to={user ? '/conta/favoritos' : '/entrar?next=/conta/favoritos'} className="icon-btn" aria-label={`Favoritos (${favIds.length})`}>
              <Heart size={20} />{favIds.length > 0 && <span className="count-dot">{favIds.length}</span>}
            </Link>
            <button className="icon-btn" onClick={openDrawer} aria-label={`Carrinho (${count} itens)`}>
              <ShoppingBag size={20} />{count > 0 && <span className="count-dot">{count}</span>}
            </button>
          </div>
        </div>
        <nav className="nav-desktop header-nav-row" aria-label="Principal">
          {NAV.map((n) => <NavItem key={n.label} item={n} />)}
        </nav>
      </header>

      <Drawer open={menu} onClose={() => setMenu(false)} side="left" label="Menu">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Logo onClick={() => setMenu(false)} />
          <button className="icon-btn" onClick={() => setMenu(false)} aria-label="Fechar menu"><X size={22} /></button>
        </div>
        <nav aria-label="Menu mobile">
          {NAV.map((n) => <NavItem key={n.label} item={n} mobile onClick={() => setMenu(false)} />)}
          <Link to={user ? '/conta' : '/entrar'} onClick={() => setMenu(false)}>{user ? 'Minha conta' : 'Entrar / Cadastrar'}</Link>
          {user?.role === 'admin' && <Link to="/admin" onClick={() => setMenu(false)}>Painel administrativo</Link>}
        </nav>
      </Drawer>
      <SearchPanel open={search} onClose={() => setSearch(false)} />
    </>
  );
}

function Footer() {
  const { settings: s } = useStore();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const wa = s.whatsapp ? `https://wa.me/${String(s.whatsapp).replace(/\D/g, '')}` : null;

  return (
    <>
      <section className="newsletter" aria-labelledby="nl-title">
        <div className="container">
          <h2 id="nl-title" className="title-lg">Entre para o círculo <span className="serif" style={{ color: 'var(--accent)' }}>{s.store_name}</span></h2>
          <p style={{ opacity: 0.75, marginTop: 8 }}>Lançamentos e ofertas exclusivas no seu e-mail.</p>
          <form onSubmit={(e) => { e.preventDefault(); toast.success('Inscrição registrada. Obrigado!'); setEmail(''); }}>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu melhor e-mail" aria-label="E-mail para newsletter" />
            <button className="btn btn-accent" type="submit">Assinar</button>
          </form>
        </div>
      </section>
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="logo" style={{ paddingLeft: 0 }}>{s.store_name}</div>
              <p style={{ maxWidth: 340 }}>{s.store_description}</p>
              <div className="social">
                {s.instagram && <a href={s.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={17} /></a>}
                {s.facebook && <a href={s.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook size={17} /></a>}
                {s.tiktok && <a href={s.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok"><Music2 size={17} /></a>}
                {wa && <a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle size={17} /></a>}
              </div>
            </div>
            <div>
              <h4>Comprar</h4>
              <ul>
                <li><Link to="/catalogo?genero=masculino">Masculino</Link></li>
                <li><Link to="/catalogo?genero=feminino">Feminino</Link></li>
                <li><Link to="/colecoes">Coleções</Link></li>
                <li><Link to="/catalogo?novidades=1">Novidades</Link></li>
                <li><Link to="/catalogo?promocoes=1">Promoções</Link></li>
              </ul>
            </div>
            <div>
              <h4>Ajuda</h4>
              <ul>
                <li><Link to="/conta/pedidos">Acompanhar pedido</Link></li>
                <li><Link to="/institucional#trocas">Trocas e devoluções</Link></li>
                <li><Link to="/institucional">Sobre a {s.store_name}</Link></li>
                <li><Link to="/entrar">Minha conta</Link></li>
              </ul>
            </div>
            <div>
              <h4>Atendimento</h4>
              <ul>
                {s.phone && <li style={{ display: 'flex', gap: 8 }}><Phone size={15} style={{ marginTop: 4 }} />{s.phone}</li>}
                {s.email && <li style={{ display: 'flex', gap: 8 }}><Mail size={15} style={{ marginTop: 4 }} /><a href={`mailto:${s.email}`}>{s.email}</a></li>}
                {s.address && <li style={{ display: 'flex', gap: 8 }}><MapPin size={15} style={{ marginTop: 4, flex: 'none' }} />{s.address}</li>}
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} {s.store_name}. Todos os direitos reservados.</span>
            <span>Projeto de demonstração — pagamentos confirmados manualmente.</span>
          </div>
        </div>
      </footer>
    </>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);
  return null;
}

export default function Layout() {
  return (
    <>
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      <ScrollToTop />
      <Header />
      <main id="conteudo"><Outlet /></main>
      <Footer />
      <CartDrawer />
    </>
  );
}
