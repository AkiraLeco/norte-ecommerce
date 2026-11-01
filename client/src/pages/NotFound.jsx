import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/hooks.js';

export default function NotFound() {
  useDocumentTitle('Página não encontrada');
  return (
    <div className="container" style={{ textAlign: 'center', padding: '96px var(--gutter)' }}>
      <p className="title-xl" style={{ fontSize: 'clamp(80px, 18vw, 180px)', color: 'var(--accent)' }}>404</p>
      <h1 className="title-md" style={{ margin: '12px 0 8px' }}>Página não encontrada</h1>
      <p className="muted" style={{ marginBottom: 24 }}>O endereço que você acessou não existe ou foi movido.</p>
      <Link to="/" className="btn">Voltar ao início</Link>
    </div>
  );
}
