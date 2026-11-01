import { useState } from 'react';
import { Plus, Pencil, Trash2, ImagePlus } from 'lucide-react';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useDocumentTitle, useFetch } from '../../hooks/hooks.js';
import { ConfirmDialog, EmptyState, Field, Modal, Spinner } from '../../components/ui.jsx';

const BLANK = { name: '', description: '', sort_order: 0, active: true, image: null, file: null, removeImage: false };

export default function Categories() {
  useDocumentTitle('Categorias — Admin');
  const toast = useToast();
  const { data, loading, reload } = useFetch(() => api.get('/categories', { admin: 1 }).then((r) => r.items), []);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const fd = new FormData();
      fd.append('name', edit.name); fd.append('description', edit.description || ''); fd.append('sort_order', edit.sort_order); fd.append('active', edit.active);
      if (edit.file) fd.append('image', edit.file);
      const qs = edit.removeImage && !edit.file ? '?remove_image=1' : '';
      await api.upload(edit.id ? 'PUT' : 'POST', edit.id ? `/categories/${edit.id}${qs}` : '/categories', fd);
      toast.success('Categoria salva.'); setEdit(null); reload();
    } catch (err) { setError(err.message); }
    setBusy(false);
  };
  const remove = async () => {
    setBusy(true);
    try { await api.delete(`/categories/${del.id}`); toast.success('Categoria excluída.'); setDel(null); reload(); } catch (e) { toast.error(e.message); }
    setBusy(false);
  };
  const reorder = async (c, delta) => {
    const fd = new FormData();
    fd.append('name', c.name); fd.append('description', c.description || ''); fd.append('sort_order', Math.max(0, c.sort_order + delta)); fd.append('active', c.active);
    try { await api.upload('PUT', `/categories/${c.id}`, fd); reload(); } catch (e) { toast.error(e.message); }
  };

  const preview = edit?.file ? URL.createObjectURL(edit.file) : edit?.removeImage ? null : edit?.image;

  return (
    <>
      <div className="admin-title"><h1>Categorias</h1><button className="btn btn-sm" onClick={() => { setError(''); setEdit({ ...BLANK }); }}><Plus size={15} /> Nova categoria</button></div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Categoria</th><th>Slug</th><th className="num">Produtos</th><th>Ordem</th><th>Status</th><th /></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6}><div className="skeleton" style={{ height: 40 }} /></td></tr>}
            {data?.map((c) => (
              <tr key={c.id}>
                <td><div className="cell-product">{c.image ? <img className="thumb" src={c.image} alt="" /> : <div className="thumb skeleton" style={{ width: 44, height: 55 }} />}<div><b>{c.name}</b><small>{c.description}</small></div></div></td>
                <td className="muted">{c.slug}</td>
                <td className="num">{c.product_count}</td>
                <td><div className="row-gap" style={{ gap: 4 }}><button className="btn btn-outline btn-sm" style={{ minHeight: 28, padding: '0 8px' }} onClick={() => reorder(c, -1)} aria-label={`Subir ${c.name}`}>↑</button><span>{c.sort_order}</span><button className="btn btn-outline btn-sm" style={{ minHeight: 28, padding: '0 8px' }} onClick={() => reorder(c, 1)} aria-label={`Descer ${c.name}`}>↓</button></div></td>
                <td><span className={`pill ${c.active ? 'pill-ok' : ''}`}>{c.active ? 'Ativa' : 'Inativa'}</span></td>
                <td className="actions">
                  <button className="icon-btn" onClick={() => { setError(''); setEdit({ ...BLANK, ...c, description: c.description || '' }); }} aria-label={`Editar ${c.name}`}><Pencil size={17} /></button>
                  <button className="icon-btn" onClick={() => setDel(c)} aria-label={`Excluir ${c.name}`}><Trash2 size={17} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && data?.length === 0 && <EmptyState title="Nenhuma categoria" text="Crie a primeira para organizar o catálogo." />}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} label="Categoria">
        {edit && (
          <form className="stack" onSubmit={save}>
            <h2 className="title-md" aria-hidden>{edit.id ? 'Editar categoria' : 'Nova categoria'}</h2>
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <Field label="Nome" htmlFor="c-name"><input id="c-name" className="input" required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} data-autofocus /></Field>
            <Field label="Descrição" htmlFor="c-desc"><textarea id="c-desc" className="textarea" rows={2} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <Field label="Ordem de exibição" htmlFor="c-ord"><input id="c-ord" className="input" type="number" min="0" value={edit.sort_order} onChange={(e) => setEdit({ ...edit, sort_order: e.target.value })} /></Field>
            <div>
              <span className="label">Imagem</span>
              <div className="row-gap" style={{ marginTop: 8 }}>
                {preview && <img src={preview} alt="" style={{ width: 80, aspectRatio: '4/5', objectFit: 'cover' }} />}
                <label className="btn btn-outline btn-sm"><ImagePlus size={14} /> Escolher imagem<input type="file" hidden accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => e.target.files[0] && setEdit({ ...edit, file: e.target.files[0], removeImage: false })} /></label>
                {preview && <button type="button" className="remove-btn" onClick={() => setEdit({ ...edit, file: null, removeImage: true })}>Remover</button>}
              </div>
            </div>
            <label className="check"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Categoria ativa</label>
            <button className="btn" disabled={busy}>{busy ? <Spinner /> : 'Salvar'}</button>
          </form>
        )}
      </Modal>
      <ConfirmDialog open={!!del} title="Excluir categoria?" text={`Os ${del?.product_count ?? 0} produto(s) desta categoria ficarão sem categoria.`} confirmLabel="Excluir" danger busy={busy} onConfirm={remove} onCancel={() => setDel(null)} />
    </>
  );
}
