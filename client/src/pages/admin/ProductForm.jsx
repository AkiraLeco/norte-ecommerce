import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ImagePlus, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useDocumentTitle, useFetch } from '../../hooks/hooks.js';
import { fromCents, toCents } from '../../services/format.js';
import { ConfirmDialog, Field, Spinner } from '../../components/ui.jsx';

const BLANK = { name: '', description: '', brand: 'NORTE', gender: 'unissex', category_id: '', price: '', sale_price: '', fabric: '', care: '', featured: false, is_new: false, active: true };

export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  useDocumentTitle(isNew ? 'Novo produto — Admin' : 'Editar produto — Admin');

  const { data: cats } = useFetch(() => api.get('/categories', { admin: 1 }).then((r) => r.items), []);
  const { data: sizes, reload: reloadSizes } = useFetch(() => api.get('/sizes').then((r) => r.items), []);
  const { data: colors, reload: reloadColors } = useFetch(() => api.get('/colors').then((r) => r.items), []);
  const { data: loaded, loading } = useFetch(() => (isNew ? null : api.get(`/products/${id}`, { admin: 1 }).then((r) => r.item)), [id]);

  const [form, setForm] = useState(BLANK);
  const [stock, setStock] = useState({}); // "colorId:sizeId" -> quantidade
  const [selColors, setSelColors] = useState([]);
  const [selSizes, setSelSizes] = useState([]);
  const [images, setImages] = useState([]); // existentes
  const [pending, setPending] = useState([]); // novas { file, preview, color_id }
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [delImg, setDelImg] = useState(null);
  const fileRef = useRef(null);
  const [newColor, setNewColor] = useState({ name: '', hex: '#888888' });
  const [newSize, setNewSize] = useState('');

  useEffect(() => {
    if (!loaded) return;
    setForm({ ...BLANK, ...loaded, category_id: loaded.category_id ?? '', price: fromCents(loaded.price), sale_price: fromCents(loaded.sale_price), brand: loaded.brand || '', description: loaded.description || '', fabric: loaded.fabric || '', care: loaded.care || '' });
    setSelColors(loaded.colors.map((c) => c.id));
    setSelSizes(loaded.sizes.map((s) => s.id));
    setStock(Object.fromEntries(loaded.variants.map((v) => [`${v.color_id}:${v.size_id}`, v.stock])));
    setImages(loaded.images);
  }, [loaded]);
  useEffect(() => () => pending.forEach((p) => URL.revokeObjectURL(p.preview)), []); // eslint-disable-line

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const colorById = useMemo(() => Object.fromEntries((colors || []).map((c) => [c.id, c])), [colors]);
  const sizeList = useMemo(() => (sizes || []).filter((s) => selSizes.includes(s.id)), [sizes, selSizes]);
  const colorList = useMemo(() => (colors || []).filter((c) => selColors.includes(c.id)), [colors, selColors]);
  const total = colorList.reduce((n, c) => n + sizeList.reduce((m, s) => m + (Number(stock[`${c.id}:${s.id}`]) || 0), 0), 0);

  const addColor = async () => {
    try { const r = await api.post('/admin/colors', newColor); await reloadColors(); setSelColors((l) => [...l, r.item.id]); setNewColor({ name: '', hex: '#888888' }); } catch (e) { toast.error(e.message); }
  };
  const addSize = async () => {
    try { const r = await api.post('/admin/sizes', { name: newSize, sort_order: 100 }); await reloadSizes(); setSelSizes((l) => [...l, r.item.id]); setNewSize(''); } catch (e) { toast.error(e.message); }
  };

  const onFiles = (files) => {
    const added = [...files].map((file) => ({ file, preview: URL.createObjectURL(file), color_id: selColors[0] ?? '' }));
    setPending((p) => [...p, ...added]);
  };

  const validate = () => {
    const err = {};
    if (!form.name.trim()) err.name = 'Informe o nome.';
    const price = toCents(form.price);
    const sale = toCents(form.sale_price);
    if (!price || price <= 0) err.price = 'Informe um preço válido.';
    if (sale != null && price && sale >= price) err.sale_price = 'Deve ser menor que o preço.';
    setErrors(err);
    return { ok: !Object.keys(err).length, price, sale };
  };

  const submit = async (e) => {
    e.preventDefault();
    const { ok, price, sale } = validate();
    if (!ok) { toast.error('Corrija os campos destacados.'); return; }
    if (!colorList.length || !sizeList.length) { toast.error('Selecione ao menos uma cor e um tamanho para gerar as variações.'); return; }
    setBusy(true);
    try {
      const body = {
        name: form.name, description: form.description, brand: form.brand, gender: form.gender, category_id: form.category_id || null,
        price, sale_price: sale, fabric: form.fabric, care: form.care, featured: form.featured, is_new: form.is_new, active: form.active,
        variants: colorList.flatMap((c) => sizeList.map((s) => ({ size_id: s.id, color_id: c.id, quantity: Number(stock[`${c.id}:${s.id}`]) || 0 }))),
      };
      const saved = (await (isNew ? api.post('/products', body) : api.put(`/products/${id}`, body))).item;

      // Envia as novas imagens agrupadas por cor.
      const groups = new Map();
      pending.forEach((p) => groups.set(p.color_id || '', [...(groups.get(p.color_id || '') || []), p.file]));
      for (const [colorId, files] of groups) {
        const fd = new FormData();
        files.forEach((f) => fd.append('images', f));
        if (colorId) fd.append('color_id', colorId);
        await api.upload('POST', `/products/${saved.id}/images`, fd);
      }
      toast.success(isNew ? 'Produto criado.' : 'Produto atualizado.');
      if (isNew) navigate(`/admin/produtos/${saved.id}`, { replace: true });
      else { setPending([]); const fresh = (await api.get(`/products/${id}`, { admin: 1 })).item; setImages(fresh.images); }
    } catch (err) {
      toast.error(err.message);
      if (err.details) setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
    }
    setBusy(false);
  };

  const recolor = async (img, colorId) => {
    try { await api.put(`/products/${id}/images/${img.id}`, { color_id: colorId || null }); setImages((l) => l.map((i) => (i.id === img.id ? { ...i, color_id: colorId ? Number(colorId) : null } : i))); } catch (e) { toast.error(e.message); }
  };
  const removeImage = async () => {
    try { await api.delete(`/products/${id}/images/${delImg.id}`); setImages((l) => l.filter((i) => i.id !== delImg.id)); setDelImg(null); toast.success('Imagem removida.'); } catch (e) { toast.error(e.message); }
  };

  if (!isNew && loading) return <div className="skeleton" style={{ height: 400 }} />;
  if (!isNew && !loaded) return <div className="alert alert-error">Produto não encontrado. <Link className="text-link" to="/admin/produtos">Voltar</Link></div>;

  const colorSelect = (value, onChange, label) => (
    <select className="select" aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">Geral (todas as cores)</option>
      {colorList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  );

  return (
    <form onSubmit={submit} noValidate>
      <div className="admin-title">
        <div className="row-gap"><Link to="/admin/produtos" className="icon-btn" aria-label="Voltar"><ArrowLeft /></Link><h1>{isNew ? 'Novo produto' : 'Editar produto'}</h1></div>
        <button className="btn btn-sm" disabled={busy}>{busy ? <Spinner /> : 'Salvar produto'}</button>
      </div>

      <div className="two-col">
        <div className="stack">
          <section className="panel stack">
            <h2>Informações básicas</h2>
            <Field label="Nome do produto" error={errors.name} htmlFor="pf-name"><input id="pf-name" className="input" value={form.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!errors.name} /></Field>
            <Field label="Descrição" htmlFor="pf-desc"><textarea id="pf-desc" className="textarea" rows={5} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
            <div className="form-grid cols-2">
              <Field label="Preço (R$)" error={errors.price} htmlFor="pf-price"><input id="pf-price" className="input" inputMode="decimal" placeholder="129,90" value={form.price} onChange={(e) => set('price', e.target.value)} aria-invalid={!!errors.price} /></Field>
              <Field label="Preço promocional (R$)" error={errors.sale_price} hint="Deixe vazio para não aplicar promoção." htmlFor="pf-sale"><input id="pf-sale" className="input" inputMode="decimal" value={form.sale_price} onChange={(e) => set('sale_price', e.target.value)} aria-invalid={!!errors.sale_price} /></Field>
              <Field label="Categoria" htmlFor="pf-cat"><select id="pf-cat" className="select" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}><option value="">Sem categoria</option>{cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
              <Field label="Gênero" htmlFor="pf-gen"><select id="pf-gen" className="select" value={form.gender} onChange={(e) => set('gender', e.target.value)}><option value="masculino">Masculino</option><option value="feminino">Feminino</option><option value="unissex">Unissex</option></select></Field>
              <Field label="Marca" htmlFor="pf-brand"><input id="pf-brand" className="input" value={form.brand} onChange={(e) => set('brand', e.target.value)} /></Field>
              <Field label="Tecido / composição" htmlFor="pf-fab"><input id="pf-fab" className="input" value={form.fabric} onChange={(e) => set('fabric', e.target.value)} /></Field>
            </div>
            <Field label="Instruções de lavagem" htmlFor="pf-care"><textarea id="pf-care" className="textarea" rows={2} value={form.care} onChange={(e) => set('care', e.target.value)} /></Field>
          </section>

          <section className="panel stack">
            <h2>Variações e estoque</h2>
            <div>
              <span className="label">Cores</span>
              <div className="toggle-row" style={{ marginTop: 8 }}>
                {colors?.map((c) => (
                  <button type="button" key={c.id} className={`toggle ${selColors.includes(c.id) ? 'on' : ''}`} aria-pressed={selColors.includes(c.id)} onClick={() => toggle(selColors, setSelColors, c.id)}>
                    <span className="swatch" style={{ background: c.hex }} />{c.name}
                  </button>
                ))}
              </div>
              <div className="row-gap" style={{ marginTop: 10 }}>
                <input className="input" style={{ width: 160, minHeight: 38 }} placeholder="Nova cor" aria-label="Nome da nova cor" value={newColor.name} onChange={(e) => setNewColor({ ...newColor, name: e.target.value })} />
                <input type="color" aria-label="Tom da nova cor" value={newColor.hex} onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })} style={{ width: 42, height: 38, border: '1.5px solid var(--line)', padding: 2, background: '#fff' }} />
                <button type="button" className="btn btn-outline btn-sm" onClick={addColor} disabled={newColor.name.trim().length < 2}><Plus size={13} /> Criar cor</button>
              </div>
            </div>
            <div>
              <span className="label">Tamanhos</span>
              <div className="toggle-row" style={{ marginTop: 8 }}>
                {sizes?.map((s) => <button type="button" key={s.id} className={`toggle ${selSizes.includes(s.id) ? 'on' : ''}`} aria-pressed={selSizes.includes(s.id)} onClick={() => toggle(selSizes, setSelSizes, s.id)}>{s.name}</button>)}
              </div>
              <div className="row-gap" style={{ marginTop: 10 }}>
                <input className="input" style={{ width: 160, minHeight: 38 }} placeholder="Novo tamanho" aria-label="Novo tamanho" value={newSize} onChange={(e) => setNewSize(e.target.value)} />
                <button type="button" className="btn btn-outline btn-sm" onClick={addSize} disabled={!newSize.trim()}><Plus size={13} /> Criar tamanho</button>
              </div>
            </div>

            {colorList.length > 0 && sizeList.length > 0 ? (
              <div className="variant-matrix">
                <table>
                  <thead><tr><th>Cor \ Tamanho</th>{sizeList.map((s) => <th key={s.id}>{s.name}</th>)}</tr></thead>
                  <tbody>
                    {colorList.map((c) => (
                      <tr key={c.id}>
                        <td><span className="swatch" style={{ background: c.hex, display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />{c.name}</td>
                        {sizeList.map((s) => {
                          const k = `${c.id}:${s.id}`;
                          return <td key={k}><input type="number" min="0" aria-label={`Estoque ${c.name} ${s.name}`} className={Number(stock[k]) === 0 ? 'zero' : ''} value={stock[k] ?? 0} onChange={(e) => setStock((st) => ({ ...st, [k]: e.target.value }))} /></td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>{colorList.length * sizeList.length} variações · {total} unidades no total. Cada combinação possui estoque próprio.</p>
              </div>
            ) : <div className="alert alert-info">Selecione cores e tamanhos para gerar a grade de estoque.</div>}
            {!isNew && <p className="muted" style={{ fontSize: 12.5 }}>Remover uma cor ou tamanho aqui exclui as variações correspondentes.</p>}
          </section>

          <section className="panel stack">
            <h2>Imagens</h2>
            <p className="muted" style={{ fontSize: 13.5 }}>Associe cada foto a uma cor: ao escolher a cor na loja, a galeria troca automaticamente. A primeira imagem é a capa. JPG, PNG, WEBP ou AVIF até 5 MB.</p>
            <label className="dropzone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}>
              <ImagePlus size={28} /><div>Clique ou arraste as fotos aqui</div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
            </label>
            <div className="img-grid">
              {images.map((img) => (
                <div className="img-tile" key={img.id}>
                  <img src={img.path} alt="" />
                  <button type="button" className="rm" onClick={() => setDelImg(img)} aria-label="Remover imagem"><Trash2 size={14} /></button>
                  <select className="select" aria-label="Cor da imagem" value={img.color_id ?? ''} onChange={(e) => recolor(img, e.target.value)}>
                    <option value="">Geral</option>{colors?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              ))}
              {pending.map((p, i) => (
                <div className="img-tile" key={p.preview}>
                  <img src={p.preview} alt="" /><span className="badge badge-new tag">Nova</span>
                  <button type="button" className="rm" onClick={() => { URL.revokeObjectURL(p.preview); setPending((l) => l.filter((_, j) => j !== i)); }} aria-label="Descartar imagem"><Trash2 size={14} /></button>
                  {colorSelect(p.color_id, (v) => setPending((l) => l.map((x, j) => (j === i ? { ...x, color_id: v } : x))), 'Cor da nova imagem')}
                </div>
              ))}
            </div>
            {pending.length > 0 && <p className="muted" style={{ fontSize: 13 }}>{pending.length} imagem(ns) serão enviadas ao salvar.</p>}
          </section>
        </div>

        <aside className="stack">
          <section className="panel stack">
            <h2>Publicação</h2>
            <label className="check"><input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> Produto ativo (visível na loja)</label>
            <label className="check"><input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} /> Produto em destaque</label>
            <label className="check"><input type="checkbox" checked={form.is_new} onChange={(e) => set('is_new', e.target.checked)} /> Marcar como lançamento</label>
            <button className="btn btn-block" disabled={busy}>{busy ? <Spinner /> : 'Salvar produto'}</button>
            {!isNew && loaded && <Link to={`/produto/${loaded.slug}`} target="_blank" className="link-arrow" style={{ alignSelf: 'center' }}>Ver na loja</Link>}
          </section>
        </aside>
      </div>
      <ConfirmDialog open={!!delImg} title="Remover imagem?" text="O arquivo será apagado do servidor." confirmLabel="Remover" danger onConfirm={removeImage} onCancel={() => setDelImg(null)} />
    </form>
  );
}
