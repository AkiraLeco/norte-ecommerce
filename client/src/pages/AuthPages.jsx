import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/hooks.js';
import { maskCpf, maskPhone } from '../services/format.js';
import { Field, Spinner } from '../components/ui.jsx';

// Evita redirecionamento aberto: só aceita caminhos internos.
const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/');

function useAuthForm(action) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const next = safeNext(params.get('next'));

  const submit = async (data) => {
    setBusy(true); setError(''); setFieldErrors({});
    try {
      const u = await action(data);
      toast.success(`Bem-vindo(a), ${u.name.split(' ')[0]}!`);
      navigate(u.role === 'admin' && next === '/' ? '/admin' : next, { replace: true });
    } catch (e) {
      setError(e.message);
      if (e.details) setFieldErrors(Object.fromEntries(e.details.map((d) => [d.field, d.message])));
    }
    setBusy(false);
  };
  return { submit, busy, error, fieldErrors, next };
}

export function Login() {
  useDocumentTitle('Entrar');
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const f = useAuthForm((d) => login(d.email, d.password));
  if (user) return <Navigate to={f.next} replace />;

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={(e) => { e.preventDefault(); f.submit({ email, password }); }}>
        <div><span className="eyebrow">Minha conta</span><h1 className="title-lg" style={{ marginTop: 8 }}>Entrar</h1></div>
        {f.error && <div className="alert alert-error" role="alert">{f.error}</div>}
        <Field label="E-mail" htmlFor="email"><input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Senha" htmlFor="password"><input id="password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <button className="btn btn-block" disabled={f.busy}>{f.busy ? <Spinner /> : 'Entrar'}</button>
        <p className="muted">Ainda não tem conta? <Link className="text-link" to={`/cadastrar${f.next !== '/' ? `?next=${encodeURIComponent(f.next)}` : ''}`}>Cadastre-se</Link></p>
      </form>
    </div>
  );
}

export function Register() {
  useDocumentTitle('Criar conta');
  const { user, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', cpf: '', password: '' });
  const f = useAuthForm((d) => register(d));
  if (user) return <Navigate to={f.next} replace />;
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={(e) => { e.preventDefault(); f.submit({ ...form, phone: form.phone || undefined, cpf: form.cpf || undefined }); }}>
        <div><span className="eyebrow">Nova conta</span><h1 className="title-lg" style={{ marginTop: 8 }}>Criar conta</h1></div>
        {f.error && <div className="alert alert-error" role="alert">{f.error}</div>}
        <Field label="Nome completo" htmlFor="r-name" error={f.fieldErrors.name}><input id="r-name" className="input" autoComplete="name" required value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="E-mail" htmlFor="r-email" error={f.fieldErrors.email}><input id="r-email" className="input" type="email" autoComplete="email" required value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <div className="form-grid cols-2">
          <Field label="Telefone" htmlFor="r-phone"><input id="r-phone" className="input" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} /></Field>
          <Field label="CPF (opcional)" htmlFor="r-cpf" error={f.fieldErrors.cpf}><input id="r-cpf" className="input" inputMode="numeric" value={form.cpf} onChange={(e) => set('cpf', maskCpf(e.target.value))} /></Field>
        </div>
        <Field label="Senha" htmlFor="r-pass" hint="Mínimo de 8 caracteres." error={f.fieldErrors.password}><input id="r-pass" className="input" type="password" autoComplete="new-password" minLength={8} required value={form.password} onChange={(e) => set('password', e.target.value)} /></Field>
        <button className="btn btn-block" disabled={f.busy}>{f.busy ? <Spinner /> : 'Criar conta'}</button>
        <p className="muted">Já tem conta? <Link className="text-link" to={`/entrar${f.next !== '/' ? `?next=${encodeURIComponent(f.next)}` : ''}`}>Entrar</Link></p>
      </form>
    </div>
  );
}
