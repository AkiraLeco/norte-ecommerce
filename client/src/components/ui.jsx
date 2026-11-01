import { useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Minus, Plus, PackageSearch } from 'lucide-react';
import { money, STATUS } from '../services/format.js';

export function Spinner() {
  return <span className="spinner" role="status" aria-label="Carregando" />;
}

export function Price({ product, big = false }) {
  const p = product;
  return (
    <div className={`price ${big ? 'big' : ''}`}>
      <strong>{money(p.final_price)}</strong>
      {p.on_sale && <s aria-label={`Preço original ${money(p.price)}`}>{money(p.price)}</s>}
      {p.on_sale && big && <span className="off">-{p.discount_percent}%</span>}
    </div>
  );
}

export function Swatches({ colors, max = 5 }) {
  if (!colors?.length) return null;
  return (
    <div className="swatches" aria-label={`${colors.length} cores disponíveis`}>
      {colors.slice(0, max).map((c) => <span key={c.id} className="swatch" style={{ background: c.hex }} title={c.name} />)}
      {colors.length > max && <span className="swatch-more">+{colors.length - max}</span>}
    </div>
  );
}

export function Field({ label, error, hint, children, htmlFor }) {
  return (
    <div className="field">
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  );
}

export function StatusPill({ status }) {
  const s = STATUS[status] || { label: status, tone: 'info' };
  return <span className={`pill pill-${s.tone}`}>{s.label}</span>;
}

export function EmptyState({ icon: Icon = PackageSearch, title, text, action }) {
  return (
    <div className="empty">
      <Icon size={44} strokeWidth={1.3} aria-hidden />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="pcard pcard-skeleton" aria-hidden>
      <div className="skeleton" style={{ aspectRatio: '4/5' }} />
      <div className="pcard-body">
        <div className="skeleton" style={{ height: 14, width: '80%' }} />
        <div className="skeleton" style={{ height: 14, width: '40%' }} />
      </div>
    </div>
  );
}

export function QtyStepper({ value, onChange, max = 99, small = false }) {
  return (
    <div className={`qty ${small ? 'sm' : ''}`} role="group" aria-label="Quantidade">
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Diminuir quantidade"><Minus size={14} /></button>
      <span aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Aumentar quantidade"><Plus size={14} /></button>
    </div>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  const nums = [];
  for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
  const withGaps = nums.flatMap((n, i) => (i && n - nums[i - 1] > 1 ? ['…' + n, n] : [n]));
  return (
    <nav className="pagination" aria-label="Paginação">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Página anterior"><ChevronLeft size={16} /></button>
      {withGaps.map((n) => (typeof n === 'string'
        ? <span key={n} style={{ alignSelf: 'center' }}>…</span>
        : <button key={n} className={n === page ? 'on' : ''} aria-current={n === page ? 'page' : undefined} onClick={() => onChange(n)}>{n}</button>))}
      <button onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Próxima página"><ChevronRight size={16} /></button>
    </nav>
  );
}

// Modal acessível: fecha com Esc, prende o foco e trava a rolagem do fundo.
export function Modal({ open, onClose, children, size = 'md', label, flush = false }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.querySelector('[data-autofocus], .modal-close')?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="overlay" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <div className="modal-wrap">
            <motion.div ref={ref} className={`modal ${size === 'sm' ? 'modal-sm' : ''}`} role="dialog" aria-modal="true" aria-labelledby={label ? titleId : undefined}
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} transition={{ duration: 0.25 }}>
              {label && <span id={titleId} className="sr-only">{label}</span>}
              <button className="icon-btn modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
              <div className={`modal-body ${flush ? 'flush' : ''}`}>{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({ open, title, text, confirmLabel = 'Confirmar', danger = false, busy = false, onConfirm, onCancel }) {
  return (
    <Modal open={open} onClose={onCancel} size="sm" label={title}>
      <div className="stack">
        <h3 className="title-md" aria-hidden>{title}</h3>
        <p className="muted">{text}</p>
        <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-outline btn-sm" onClick={onCancel} data-autofocus>Cancelar</button>
          <button className={`btn btn-sm ${danger ? 'btn-danger' : ''}`} onClick={onConfirm} disabled={busy}>{busy ? <Spinner /> : confirmLabel}</button>
        </div>
      </div>
    </Modal>
  );
}

// Drawer lateral com overlay (usado pelo carrinho e menu mobile).
export function Drawer({ open, onClose, side = 'right', label, children, className = '' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  const x = side === 'right' ? '100%' : '-100%';
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="overlay" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside className={`${side === 'right' ? 'drawer' : 'mobile-menu'} ${className}`} role="dialog" aria-modal="true" aria-label={label}
            initial={{ x }} animate={{ x: 0 }} exit={{ x }} transition={{ type: 'tween', duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export const fadeUp = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } };

export { money };
