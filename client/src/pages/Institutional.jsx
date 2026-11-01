import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext.jsx';
import { useDocumentTitle } from '../hooks/hooks.js';

export default function Institutional() {
  useDocumentTitle('Institucional');
  const { settings: s } = useStore();
  const { hash } = useLocation();
  useEffect(() => { if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' }); }, [hash]);

  return (
    <div className="container" style={{ padding: '48px var(--gutter) 88px' }}>
      <span className="eyebrow">Institucional</span>
      <h1 className="title-lg" style={{ margin: '8px 0 28px' }}>Sobre a {s.store_name}</h1>
      <div className="prose">
        <p>{s.about}</p>
        <h2 id="trocas" className="title-md" style={{ marginTop: 24 }}>Trocas e devoluções</h2>
        <p>{s.policy_exchange}</p>
        <h2 className="title-md" style={{ marginTop: 24 }}>Entrega</h2>
        <p>Prazo estimado: {s.shipping_days}.</p>
        <h2 className="title-md" style={{ marginTop: 24 }}>Atendimento</h2>
        <p>{[s.email, s.phone, s.address].filter(Boolean).join(' · ')}</p>
      </div>
    </div>
  );
}
