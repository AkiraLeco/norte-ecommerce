import { Ruler } from 'lucide-react';
import { QtyStepper } from './ui.jsx';

// Seletor de cor, tamanho e quantidade — compartilhado entre a página do produto e a visualização rápida.
export default function VariantPicker({ product, sel, showError, onSizeGuide }) {
  const multiColor = product.colors.length > 0;
  const colorName = product.colors.find((c) => c.id === sel.colorId)?.name;
  return (
    <>
      {multiColor && (
        <div className="pdp-block" role="radiogroup" aria-label="Cor">
          <div className="row"><span className="label">Cor</span><span>{colorName || 'Selecione'}</span></div>
          <div className="size-chips">
            {product.colors.map((c) => {
              const ok = sel.colorAvailable(c.id);
              return (
                <button key={c.id} type="button" role="radio" aria-checked={sel.colorId === c.id} aria-label={`${c.name}${ok ? '' : ' (indisponível)'}`}
                  className={`color-dot ${sel.colorId === c.id ? 'on' : ''} ${ok ? '' : 'out'}`} style={{ background: c.hex }} title={c.name}
                  onClick={() => sel.setColorId(c.id)} />
              );
            })}
          </div>
          {showError && !sel.colorId && <span className="field-error" role="alert">Selecione uma cor.</span>}
        </div>
      )}

      <div className="pdp-block" role="radiogroup" aria-label="Tamanho">
        <div className="row">
          <span className="label">Tamanho</span>
          {onSizeGuide && <button type="button" className="text-link" onClick={onSizeGuide} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Ruler size={14} /> Guia de medidas</button>}
        </div>
        <div className="size-chips">
          {product.sizes.map((s) => {
            const ok = sel.sizeAvailable(s.id);
            return (
              <button key={s.id} type="button" role="radio" aria-checked={sel.sizeId === s.id} disabled={!ok}
                aria-label={`Tamanho ${s.name}${ok ? '' : ' (indisponível)'}`}
                className={`size-chip ${sel.sizeId === s.id ? 'on' : ''} ${ok ? '' : 'out'}`} onClick={() => sel.setSizeId(s.id)}>
                {s.name}
              </button>
            );
          })}
        </div>
        {showError && !sel.sizeId && <span className="field-error" role="alert">Selecione um tamanho.</span>}
      </div>

      <div className="pdp-block">
        <span className="label">Quantidade</span>
        <div className="row-gap">
          <QtyStepper value={sel.qty} onChange={sel.setQty} max={sel.variant?.stock || 1} />
          <StockNote variant={sel.variant} picked={!!(sel.colorId && sel.sizeId)} />
        </div>
      </div>
    </>
  );
}

export function StockNote({ variant, picked }) {
  if (!picked) return <span className="stock-note muted">Escolha cor e tamanho para ver a disponibilidade.</span>;
  if (!variant || variant.stock <= 0) return <span className="stock-note out">Esgotado nesta combinação</span>;
  if (variant.stock <= 5) return <span className="stock-note low">Últimas {variant.stock} unidade(s)</span>;
  return <span className="stock-note ok">Em estoque</span>;
}
