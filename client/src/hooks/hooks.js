import { useCallback, useEffect, useRef, useState } from 'react';

// Carrega dados assíncronos com estados de loading/erro e recarga manual.
export function useFetch(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const ref = useRef(fetcher);
  ref.current = fetcher;

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      setState({ data: await ref.current(), loading: false, error: null });
    } catch (e) {
      setState({ data: null, loading: false, error: e.message });
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, deps);
  return { ...state, reload: load };
}

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — NORTE` : 'NORTE — Moda e Vestuário';
  }, [title]);
}

export function useDebounce(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

// Seleção de tamanho/cor/quantidade compartilhada entre a página do produto e a visualização rápida.
export function useVariantSelection(product) {
  const [colorId, setColorId] = useState(null);
  const [sizeId, setSizeId] = useState(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setColorId(product?.colors.length === 1 ? product.colors[0].id : null);
    setSizeId(product?.sizes.length === 1 ? product.sizes[0].id : null);
    setQty(1);
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const variant = product?.variants.find((v) => v.color_id === colorId && v.size_id === sizeId) || null;
  const stockFor = (cId, sId) => product?.variants.find((v) => v.color_id === cId && v.size_id === sId)?.stock ?? 0;

  useEffect(() => { if (variant && qty > variant.stock) setQty(Math.max(1, variant.stock)); }, [variant, qty]);

  return {
    colorId, setColorId, sizeId, setSizeId, qty, setQty, variant,
    // tamanho "indisponível" = sem estoque na cor escolhida (ou em nenhuma cor, se nenhuma foi escolhida)
    sizeAvailable: (sId) => (colorId ? stockFor(colorId, sId) > 0 : product.colors.some((c) => stockFor(c.id, sId) > 0)),
    colorAvailable: (cId) => (sizeId ? stockFor(cId, sizeId) > 0 : product.sizes.some((s) => stockFor(cId, s.id) > 0)),
  };
}
