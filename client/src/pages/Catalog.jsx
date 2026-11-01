import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, SearchX } from 'lucide-react';
import { api } from '../services/api.js';
import { useDebounce, useDocumentTitle, useFetch } from '../hooks/hooks.js';
import { toCents, money } from '../services/format.js';
import ProductCard from '../components/ProductCard.jsx';
import QuickView from '../components/QuickView.jsx';
import { EmptyState, Pagination, ProductCardSkeleton } from '../components/ui.jsx';

const SORTS = [
  ['recent', 'Mais recentes'],
  ['best', 'Mais vendidos'],
  ['price_asc', 'Menor preço'],
  ['price_desc', 'Maior preço'],
  ['popular', 'Mais populares'],
];
const GENDERS = { masculino: 'Masculino', feminino: 'Feminino', unissex: 'Unissex' };
const LIMIT = 12;

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const [quick, setQuick] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = params.get('q') || '';
  const [search, setSearch] = useState(q);
  const dSearch = useDebounce(search, 400);
  const [min, setMin] = useState(params.get('min') || '');
  const [max, setMax] = useState(params.get('max') || '');

  const get = (k) => params.get(k) || '';
  const page = Number(get('pagina')) || 1;
  const sort = get('ordem') || 'recent';

  const patch = (changes, keepPage = false) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) (v === '' || v == null || v === false ? next.delete(k) : next.set(k, v === true ? '1' : v));
    if (!keepPage) next.delete('pagina');
    setParams(next, { replace: true });
  };

  // busca (debounce) e faixa de preço sincronizam com a URL
  useEffect(() => { if (dSearch !== q) patch({ q: dSearch }); }, [dSearch]); // eslint-disable-line
  useEffect(() => { setSearch(q); }, [q]);
  const priceKey = `${get('min')}|${get('max')}`;
  useEffect(() => { setMin(get('min')); setMax(get('max')); }, [priceKey]); // eslint-disable-line

  const { data: opts } = useFetch(() => api.get('/products/filters'), []);
  const { data: cats } = useFetch(() => api.get('/categories').then((r) => r.items), []);

  const query = {
    q, category: get('categoria'), gender: get('genero'), brand: get('marca'), size: get('tamanho'), color: get('cor'),
    min: get('min') ? toCents(get('min')) : '', max: get('max') ? toCents(get('max')) : '',
    available: get('disponivel') ? '1' : '', promo: get('promocoes') ? '1' : '', new: get('novidades') ? '1' : '',
    sort, page, limit: LIMIT,
  };
  const { data, loading, error } = useFetch(() => api.get('/products', query), [params.toString()]);

  const category = cats?.find((c) => c.slug === get('categoria'));
  const heading = category?.name || (get('genero') ? GENDERS[get('genero')] : get('promocoes') ? 'Promoções' : get('novidades') ? 'Novidades' : q ? `Resultados para “${q}”` : 'Todos os produtos');
  useDocumentTitle(heading);

  const chips = useMemo(() => {
    const list = [];
    if (q) list.push(['q', `Busca: ${q}`]);
    if (get('categoria')) list.push(['categoria', category?.name || get('categoria')]);
    if (get('genero')) list.push(['genero', GENDERS[get('genero')]]);
    if (get('tamanho')) list.push(['tamanho', `Tamanho ${opts?.sizes.find((s) => String(s.id) === get('tamanho'))?.name || ''}`]);
    if (get('cor')) list.push(['cor', opts?.colors.find((c) => String(c.id) === get('cor'))?.name || 'Cor']);
    if (get('marca')) list.push(['marca', get('marca')]);
    if (get('min') || get('max')) list.push(['preco', `Preço: ${get('min') ? money(toCents(get('min'))) : '…'} – ${get('max') ? money(toCents(get('max'))) : '…'}`]);
    if (get('disponivel')) list.push(['disponivel', 'Em estoque']);
    if (get('promocoes')) list.push(['promocoes', 'Promoções']);
    if (get('novidades')) list.push(['novidades', 'Novidades']);
    return list;
  }, [params, opts, category]); // eslint-disable-line

  const removeChip = (k) => (k === 'preco' ? patch({ min: '', max: '' }) : patch({ [k]: '' }));
  const clearAll = () => setParams(new URLSearchParams(sort !== 'recent' ? { ordem: sort } : {}), { replace: true });
  const applyPrice = () => patch({ min: min.replace(/[^\d,]/g, ''), max: max.replace(/[^\d,]/g, '') });

  const Check = ({ k, label }) => (
    <label className="check"><input type="checkbox" checked={!!get(k)} onChange={(e) => patch({ [k]: e.target.checked })} /> {label}</label>
  );

  const filters = (
    <>
      <div className="filters-head">
        <h2 className="title-md">Filtros</h2>
        <button className="icon-btn" onClick={() => setFiltersOpen(false)} aria-label="Fechar filtros"><X size={20} /></button>
      </div>
      <div className="filter-group">
        <h4>Categoria</h4>
        <div className="filter-list">
          <label className="check"><input type="radio" name="cat" checked={!get('categoria')} onChange={() => patch({ categoria: '' })} /> Todas</label>
          {cats?.map((c) => (
            <label className="check" key={c.id}><input type="radio" name="cat" checked={get('categoria') === c.slug} onChange={() => patch({ categoria: c.slug })} /> {c.name} <span className="muted">({c.product_count})</span></label>
          ))}
        </div>
      </div>
      <div className="filter-group">
        <h4>Gênero</h4>
        <div className="filter-list">
          <label className="check"><input type="radio" name="gen" checked={!get('genero')} onChange={() => patch({ genero: '' })} /> Todos</label>
          {Object.entries(GENDERS).map(([v, l]) => (
            <label className="check" key={v}><input type="radio" name="gen" checked={get('genero') === v} onChange={() => patch({ genero: v })} /> {l}</label>
          ))}
        </div>
      </div>
      {opts?.sizes.length > 0 && (
        <div className="filter-group">
          <h4>Tamanho</h4>
          <div className="size-chips">
            {opts.sizes.map((s) => (
              <button key={s.id} className={`size-chip ${get('tamanho') === String(s.id) ? 'on' : ''}`} aria-pressed={get('tamanho') === String(s.id)}
                onClick={() => patch({ tamanho: get('tamanho') === String(s.id) ? '' : s.id })}>{s.name}</button>
            ))}
          </div>
        </div>
      )}
      {opts?.colors.length > 0 && (
        <div className="filter-group">
          <h4>Cor</h4>
          <div className="size-chips">
            {opts.colors.map((c) => (
              <button key={c.id} className={`color-dot ${get('cor') === String(c.id) ? 'on' : ''}`} style={{ background: c.hex }} title={c.name} aria-label={c.name}
                aria-pressed={get('cor') === String(c.id)} onClick={() => patch({ cor: get('cor') === String(c.id) ? '' : c.id })} />
            ))}
          </div>
        </div>
      )}
      <div className="filter-group">
        <h4>Preço (R$)</h4>
        <div className="price-range">
          <input className="input" inputMode="decimal" placeholder="Mín." aria-label="Preço mínimo" value={min} onChange={(e) => setMin(e.target.value)} onBlur={applyPrice} onKeyDown={(e) => e.key === 'Enter' && applyPrice()} />
          <input className="input" inputMode="decimal" placeholder="Máx." aria-label="Preço máximo" value={max} onChange={(e) => setMax(e.target.value)} onBlur={applyPrice} onKeyDown={(e) => e.key === 'Enter' && applyPrice()} />
        </div>
      </div>
      {opts?.brands.length > 0 && (
        <div className="filter-group">
          <h4>Marca</h4>
          <div className="filter-list">
            <label className="check"><input type="radio" name="brand" checked={!get('marca')} onChange={() => patch({ marca: '' })} /> Todas</label>
            {opts.brands.map((b) => <label className="check" key={b}><input type="radio" name="brand" checked={get('marca') === b} onChange={() => patch({ marca: b })} /> {b}</label>)}
          </div>
        </div>
      )}
      <div className="filter-group">
        <h4>Disponibilidade</h4>
        <div className="filter-list"><Check k="disponivel" label="Apenas em estoque" /><Check k="promocoes" label="Somente promoções" /><Check k="novidades" label="Somente novidades" /></div>
      </div>
      <div className="filters-mobile-actions">
        <button className="btn btn-block" onClick={() => setFiltersOpen(false)}>Ver {data?.total ?? ''} resultados</button>
      </div>
    </>
  );

  return (
    <>
      <div className="page-head">
        <div className="container">
          <nav className="crumbs" aria-label="Você está em"><Link to="/">Início</Link><span>/</span><span>Catálogo</span>{heading !== 'Todos os produtos' && <><span>/</span><span>{heading}</span></>}</nav>
          <h1 className="title-lg">{heading}</h1>
          {category?.description && <p className="muted" style={{ marginTop: 8 }}>{category.description}</p>}
        </div>
      </div>

      <div className="container catalog">
        <aside className={`filters ${filtersOpen ? 'open' : ''}`} aria-label="Filtros">{filters}</aside>
        <section aria-label="Produtos">
          <div className="toolbar">
            <div className="search">
              <Search size={18} aria-hidden />
              <input className="input" type="search" placeholder="Buscar no catálogo" aria-label="Buscar no catálogo" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="row-gap">
              <button className="btn btn-outline btn-sm filter-toggle" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={15} /> Filtros{chips.length ? ` (${chips.length})` : ''}</button>
              <select className="select" style={{ minHeight: 42, width: 'auto' }} aria-label="Ordenar por" value={sort} onChange={(e) => patch({ ordem: e.target.value === 'recent' ? '' : e.target.value })}>
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <p className="muted" style={{ marginTop: 14, fontSize: 13 }} aria-live="polite">{loading ? 'Carregando…' : `${data?.total ?? 0} ${data?.total === 1 ? 'resultado' : 'resultados'}`}</p>
          {chips.length > 0 && (
            <div className="active-filters">
              {chips.map(([k, label]) => <span className="chip" key={k}>{label}<button onClick={() => removeChip(k)} aria-label={`Remover filtro ${label}`}><X size={12} /></button></span>)}
              <button className="text-link" style={{ fontSize: 13 }} onClick={clearAll}>Limpar tudo</button>
            </div>
          )}

          <div className="product-grid" style={{ marginTop: 22 }}>
            {loading && Array.from({ length: 6 }, (_, i) => <ProductCardSkeleton key={i} />)}
            {!loading && data?.items.map((p, i) => <ProductCard key={p.id} product={p} index={i} onQuickView={setQuick} />)}
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          {!loading && !error && data?.items.length === 0 && (
            <EmptyState icon={SearchX} title="Nenhum produto encontrado" text="Ajuste os filtros ou tente outro termo de busca."
              action={<button className="btn btn-outline btn-sm" onClick={clearAll}>Limpar filtros</button>} />
          )}
          {data && <Pagination page={data.page} pages={data.pages} onChange={(n) => { patch({ pagina: n === 1 ? '' : n }, true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
        </section>
      </div>
      <QuickView product={quick} onClose={() => setQuick(null)} />
    </>
  );
}
