import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { api } from '../services/api.js';
import { useDocumentTitle, useFetch } from '../hooks/hooks.js';
import { fadeUp } from '../components/ui.jsx';

export default function Collections() {
  useDocumentTitle('Coleções');
  const { data, loading } = useFetch(() => api.get('/categories').then((r) => r.items), []);
  return (
    <div className="container">
      <div className="page-head" style={{ borderBottom: 0 }}>
        <span className="eyebrow">NORTE</span>
        <h1 className="title-xl" style={{ fontSize: 'clamp(32px,6vw,64px)', marginTop: 8 }}>Coleções <span className="serif">autorais</span></h1>
        <p className="muted" style={{ maxWidth: 520, marginTop: 12 }}>Cada coleção reúne peças pensadas para combinar entre si. Escolha um universo e explore.</p>
      </div>
      <div className="cat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', paddingBottom: 72 }}>
        {loading && Array.from({ length: 5 }, (_, i) => <div key={i} className="cat-card skeleton" />)}
        {data?.map((c, i) => (
          <motion.div key={c.id} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.05 }}>
            <Link to={`/catalogo?categoria=${c.slug}`} className="cat-card">
              {c.image && <img src={c.image} alt="" loading="lazy" />}
              <span>{c.name} <small style={{ opacity: 0.8, fontWeight: 500 }}>{c.product_count} peças</small><ArrowRight size={16} /></span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
