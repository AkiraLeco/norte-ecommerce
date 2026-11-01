const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Todos os valores monetários trafegam em centavos (inteiros).
export const money = (cents) => brl.format((cents || 0) / 100);
export const toCents = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};
export const fromCents = (c) => (c == null ? '' : (c / 100).toFixed(2).replace('.', ','));

// SQLite grava datetime em UTC sem fuso; normaliza para ISO antes de converter.
const toDate = (s) => new Date(String(s).includes('T') ? s : `${String(s).replace(' ', 'T')}Z`);
export const dateTime = (s) => (s ? toDate(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
export const date = (s) => (s ? toDate(s).toLocaleDateString('pt-BR') : '—');

export const STATUS = {
  aguardando_pagamento: { label: 'Aguardando pagamento', tone: 'warn' },
  pagamento_confirmado: { label: 'Pagamento confirmado', tone: 'info' },
  em_preparacao: { label: 'Em preparação', tone: 'info' },
  enviado: { label: 'Enviado', tone: 'accent' },
  entregue: { label: 'Entregue', tone: 'ok' },
  cancelado: { label: 'Cancelado', tone: 'danger' },
};
export const STATUS_FLOW = ['aguardando_pagamento', 'pagamento_confirmado', 'em_preparacao', 'enviado', 'entregue'];

export const maskCpf = (v) => v.replace(/\D/g, '').slice(0, 11)
  .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
export const maskPhone = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};
export const maskCep = (v) => v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');

export const PAYMENT_LABELS = { pix_manual: 'Pix (confirmação manual)', transferencia: 'Transferência bancária', pagamento_retirada: 'Pagar na retirada' };

export const installment = (price, max) => {
  const n = Math.max(1, max || 1);
  return n > 1 ? `${n}x de ${money(Math.ceil(price / n))} sem juros` : null;
};

export const UF = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
