import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Truck, ShieldCheck, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../services/api.js';
import { useFetch, useDocumentTitle } from '../hooks/hooks.js';
import { useStore } from '../context/StoreContext.jsx';
import ProductCard from '../components/ProductCard.jsx';
import QuickView from '../components/QuickView.jsx';
import { ProductCardSkeleton, fadeUp, money } from '../components/ui.jsx';

function Hero({ banner }) {
  const b = banner || { title: 'VISTA SUA IDENTIDADE.', subtitle: 'Estilo, autenticidade e qualidade em cada detalhe.', cta_label: 'EXPLORAR COLEÇÃO', link: '/catalogo' };
  const words = b.title.split(' ');
  return (
    <section className="hero" aria-label="Destaque">
      {b.image && <motion.img className="hero-img" src={b.image} alt="" initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }} />}
      <div className="container hero-content">
        <motion.span className="eyebrow" style={{ color: 'var(--accent)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>Nova coleção · Outono/Inverno</motion.span>
        <h1 className="title-xl" aria-label={b.title}>
          {words.map((w, i) => (
            <motion.span key={i} aria-hidden style={{ display: 'inline-block', marginRight: '0.25em' }} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.12, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
              {i === words.length - 1 ? <span className="serif" style={{ color: 'var(--accent)' }}>{w}</span> : w}
            </motion.span>
          ))}
        </h1>
        <motion.p className="lead" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>{b.subtitle}</motion.p>
        <motion.div className="hero-cta" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.95 }}>
          <Link to={b.link || '/catalogo'} className="btn btn-light">{b.cta_label || 'EXPLORAR COLEÇÃO'}</Link>
          <Link to="/catalogo?novidades=1" className="btn btn-ghost-light">VER NOVIDADES</Link>
        </motion.div>
      </div>
      <span className="hero-meta" aria-hidden>Coleção 26</span>
    </section>
  );
}

function ProductSection({ eyebrow, title, params, link, onQuick }) {
  const { data, loading } = useFetch(() => api.get('/products', { limit: 8, ...params }), [JSON.stringify(params)]);
  return (
    <section className="section">
      <div className="container">
        <motion.div className="section-head" {...fadeUp}>
          <div><span className="eyebrow">{eyebrow}</span><h2 className="title-lg" style={{ marginTop: 8 }}>{title}</h2></div>
          <Link to={link} className="link-arrow">Ver tudo <ArrowRight size={14} /></Link>
        </motion.div>
        <div className="product-grid cols-4">
          {loading
            ? Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)
            : data.items.slice(0, 8).map((p, i) => <ProductCard key={p.id} product={p} index={i} onQuickView={onQuick} />)}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  useDocumentTitle('');
  const { settings } = useStore();
  const [quick, setQuick] = useState(null);
  const { data: banners } = useFetch(() => api.get('/banners').then((r) => r.items), []);
  const hero = banners?.find((b) => b.slot === 'hero');
  const promos = banners?.filter((b) => b.slot === 'promo') || [];
  const cards = banners?.filter((b) => b.slot === 'category') || [];

  return (
    <>
      <Hero banner={hero} />

      <section className="section" aria-labelledby="cats">
        <div className="container">
          <motion.div className="section-head" {...fadeUp}>
            <div><span className="eyebrow">Navegue por estilo</span><h2 id="cats" className="title-lg" style={{ marginTop: 8 }}>Categorias em <span className="serif">destaque</span></h2></div>
          </motion.div>
          <div className="cat-grid">
            {(banners ? cards : Array.from({ length: 6 })).map((c, i) => (c ? (
              <motion.div key={c.id} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.05 }}>
                <Link to={c.link || '/catalogo'} className="cat-card"><img src={c.image} alt="" loading="lazy" /><span>{c.title}<ArrowRight size={16} /></span></Link>
              </motion.div>
            ) : <div key={i} className="cat-card skeleton" />))}
          </div>
        </div>
      </section>

      <ProductSection eyebrow="Mais desejados" title="Produtos em destaque" params={{ featured: '1', sort: 'best' }} link="/catalogo?ordem=best" onQuick={setQuick} />

      {promos[0] && (
        <section className="container" aria-label="Campanhas">
          <div className="promo-grid">
            {promos.map((b) => (
              <motion.div key={b.id} {...fadeUp}>
                <Link to={b.link || '/catalogo'} className="promo" style={{ height: '100%' }}>
                  <img src={b.image} alt="" loading="lazy" />
                  <div className="promo-body">
                    <span className="eyebrow" style={{ color: 'var(--accent)' }}>{b.title === promos[0].title ? 'Em destaque' : 'Campanha'}</span>
                    <h3>{b.title}</h3>
                    {b.subtitle && <p>{b.subtitle}</p>}
                    <span className="link-arrow">{b.cta_label || 'Ver mais'} <ArrowRight size={14} /></span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <ProductSection eyebrow="Acabou de chegar" title="Lançamentos" params={{ new: '1', sort: 'recent' }} link="/catalogo?novidades=1" onQuick={setQuick} />
      <ProductSection eyebrow="Preços especiais" title="Ofertas da semana" params={{ promo: '1', sort: 'best' }} link="/catalogo?promocoes=1" onQuick={setQuick} />

      <section className="container">
        <div className="values">
          {[
            [Truck, 'Entrega para todo o Brasil', settings.shipping_free_min ? `Frete grátis acima de ${money(settings.shipping_free_min)}.` : 'Envio rápido e rastreável.'],
            [RefreshCw, 'Troca facilitada', 'Até 30 dias para trocar ou devolver.'],
            [ShieldCheck, 'Compra segura', 'Seus dados protegidos e preços validados.'],
            [Sparkles, 'Qualidade em cada detalhe', 'Tecidos selecionados e acabamento cuidadoso.'],
          ].map(([Icon, t, d]) => (
            <div className="value" key={t}><Icon size={26} strokeWidth={1.5} /><div><h4>{t}</h4><p>{d}</p></div></div>
          ))}
        </div>
      </section>

      <div style={{ height: 56 }} />
      <QuickView product={quick} onClose={() => setQuick(null)} />
    </>
  );
}
