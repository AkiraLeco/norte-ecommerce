import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Heart, ShoppingBag, Plus, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { api } from '../services/api.js';
import { useDocumentTitle, useFetch, useVariantSelection } from '../hooks/hooks.js';
import { useCart } from '../context/CartContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { installment } from '../services/format.js';
import VariantPicker from '../components/VariantPicker.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { EmptyState, Modal, Price, Spinner } from '../components/ui.jsx';

const SIZE_GUIDE = [
  ['PP', '86–90', '66–70', '90–94'], ['P', '90–94', '70–74', '94–98'], ['M', '94–98', '74–78', '98–102'],
  ['G', '98–104', '78–84', '102–108'], ['GG', '104–110', '84–90', '108–114'],
];
const SHOE_GUIDE = [['38', '25,0'], ['40', '26,0'], ['42', '27,5'], ['44', '29,0']];

function Gallery({ images, alt }) {
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  useEffect(() => { setIdx(0); setZoom(false); }, [images]);
  const cur = images[idx];
  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
  };
  const go = (d) => setIdx((i) => (i + d + images.length) % images.length);

  if (!images.length) return <div className="gallery-main skeleton" role="img" aria-label="Sem imagem" />;
  return (
    <div className="gallery">
      <div className="gallery-thumbs" role="tablist" aria-label="Miniaturas">
        {images.map((im, i) => (
          <button key={im.id ?? im.path} role="tab" aria-selected={i === idx} aria-label={`Imagem ${i + 1}`} className={i === idx ? 'on' : ''} onClick={() => setIdx(i)}>
            <img src={im.path} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      <div className={`gallery-main ${zoom ? 'zoom' : ''}`} onClick={() => setZoom((z) => !z)} onMouseMove={zoom ? move : undefined} onMouseLeave={() => setZoom(false)}
        role="button" tabIndex={0} aria-label={zoom ? 'Reduzir imagem' : 'Ampliar imagem'} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setZoom((z) => !z))}>
        <img src={cur.path} alt={`${alt} — imagem ${idx + 1} de ${images.length}`} style={zoom ? { transformOrigin: origin } : undefined} />
        {images.length > 1 && !zoom && (
          <>
            <button className="icon-btn gallery-nav" style={{ left: 8 }} onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Imagem anterior"><ChevronLeft /></button>
            <button className="icon-btn gallery-nav" style={{ right: 8 }} onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Próxima imagem"><ChevronRight /></button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Product() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { settings, favIds, toggleFavorite } = useStore();
  const { data: p, loading, error } = useFetch(() => api.get(`/products/${slug}`).then((r) => r.item), [slug]);
  const { data: related } = useFetch(() => (p ? api.get('/products', { category: p.category_slug, exclude: p.id, limit: 4 }).then((r) => r.items) : []), [p?.id]);
  const sel = useVariantSelection(p);
  const [showError, setShowError] = useState(false);
  const [busy, setBusy] = useState(null);
  const [guide, setGuide] = useState(false);
  useDocumentTitle(p?.name);

  useEffect(() => setShowError(false), [slug]);

  // Troca de imagem conforme a cor: imagens da cor primeiro; sem cor escolhida, todas.
  const images = useMemo(() => {
    if (!p) return [];
    if (!sel.colorId) return p.images;
    const own = p.images.filter((i) => i.color_id === sel.colorId);
    return own.length ? own : p.images;
  }, [p, sel.colorId]);

  if (loading) return <div className="container pdp"><div className="skeleton" style={{ aspectRatio: '4/5' }} /><div className="stack"><div className="skeleton" style={{ height: 40 }} /><div className="skeleton" style={{ height: 24, width: '40%' }} /><div className="skeleton" style={{ height: 200 }} /></div></div>;
  if (error || !p) return <div className="container"><EmptyState title="Produto não encontrado" text="Ele pode ter sido removido ou estar indisponível." action={<Link className="btn btn-sm" to="/catalogo">Voltar ao catálogo</Link>} /></div>;

  const fav = favIds.includes(p.id);
  const isShoe = p.sizes.every((s) => /^\d+$/.test(s.name)) && p.name.toLowerCase().includes('tênis');
  const parcel = installment(p.final_price, settings.installments_max);

  const submit = async (mode) => {
    if (!sel.colorId || !sel.sizeId) { setShowError(true); return; }
    if (!sel.variant || sel.variant.stock <= 0) return;
    setBusy(mode);
    const ok = await addItem(sel.variant.id, sel.qty, { openDrawer: mode === 'cart', silent: mode === 'buy' });
    setBusy(null);
    if (ok && mode === 'buy') navigate('/checkout');
  };

  return (
    <div className="container">
      <nav className="crumbs" style={{ paddingTop: 20 }} aria-label="Você está em">
        <Link to="/">Início</Link><span>/</span><Link to="/catalogo">Catálogo</Link>
        {p.category_name && <><span>/</span><Link to={`/catalogo?categoria=${p.category_slug}`}>{p.category_name}</Link></>}
        <span>/</span><span>{p.name}</span>
      </nav>

      <div className="pdp">
        <Gallery images={images} alt={p.name} />

        <div className="pdp-info">
          <div>
            <div className="row-gap" style={{ marginBottom: 10 }}>
              {p.on_sale && <span className="badge badge-sale">-{p.discount_percent}%</span>}
              {p.is_new && <span className="badge badge-new">Novo</span>}
              {p.brand && <span className="eyebrow">{p.brand}</span>}
            </div>
            <h1>{p.name}</h1>
          </div>
          <div>
            <Price product={p} big />
            {parcel && <p className="muted" style={{ marginTop: 4, fontSize: 13.5 }}>ou {parcel}</p>}
          </div>

          <VariantPicker product={p} sel={sel} showError={showError} onSizeGuide={() => setGuide(true)} />

          <div className="pdp-actions">
            <button className="btn" onClick={() => submit('cart')} disabled={!!busy || (sel.variant && sel.variant.stock <= 0)}>
              {busy === 'cart' ? <Spinner /> : <><ShoppingBag size={16} /> Adicionar ao carrinho</>}
            </button>
            <button className="btn btn-accent" onClick={() => submit('buy')} disabled={!!busy || (sel.variant && sel.variant.stock <= 0)}>
              {busy === 'buy' ? <Spinner /> : <><Zap size={16} /> Comprar agora</>}
            </button>
          </div>
          <button className="link-arrow" style={{ alignSelf: 'flex-start' }} onClick={() => toggleFavorite(p.id)} aria-pressed={fav}>
            <Heart size={15} fill={fav ? 'currentColor' : 'none'} /> {fav ? 'Nos favoritos' : 'Adicionar aos favoritos'}
          </button>

          <div className="accordion">
            <details open>
              <summary>Descrição <Plus size={16} /></summary>
              <div className="acc-body">{p.description || 'Sem descrição.'}</div>
            </details>
            <details>
              <summary>Tecido e composição <Plus size={16} /></summary>
              <div className="acc-body">{p.fabric || 'Informação não disponível.'}</div>
            </details>
            <details>
              <summary>Lavagem e cuidados <Plus size={16} /></summary>
              <div className="acc-body">{p.care || 'Siga as instruções da etiqueta.'}</div>
            </details>
            <details>
              <summary>Entrega e trocas <Plus size={16} /></summary>
              <div className="acc-body">Prazo estimado: {settings.shipping_days || 'consulte no checkout'}. {settings.policy_exchange}</div>
            </details>
          </div>
        </div>
      </div>

      {related?.length > 0 && (
        <section className="section" style={{ paddingTop: 24 }}>
          <div className="section-head"><h2 className="title-lg">Você também pode gostar</h2></div>
          <div className="product-grid cols-4">{related.map((r, i) => <ProductCard key={r.id} product={r} index={i} />)}</div>
        </section>
      )}

      <Modal open={guide} onClose={() => setGuide(false)} label="Guia de medidas">
        <div className="stack">
          <h2 className="title-md" aria-hidden>Guia de medidas</h2>
          <p className="muted">Medidas do corpo em centímetros. Em caso de dúvida entre dois tamanhos, escolha o maior.</p>
          <div style={{ overflowX: 'auto' }}>
            {isShoe ? (
              <table className="size-table"><thead><tr><th>Tamanho</th><th>Comprimento do pé (cm)</th></tr></thead>
                <tbody>{SHOE_GUIDE.map((r) => <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td></tr>)}</tbody></table>
            ) : (
              <table className="size-table"><thead><tr><th>Tamanho</th><th>Busto / Tórax</th><th>Cintura</th><th>Quadril</th></tr></thead>
                <tbody>{SIZE_GUIDE.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}><strong style={{ fontWeight: i ? 400 : 700 }}>{c}</strong></td>)}</tr>)}</tbody></table>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
