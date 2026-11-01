import { Link } from 'react-router-dom';
import { Heart, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../context/StoreContext.jsx';
import { Price, Swatches } from './ui.jsx';

export default function ProductCard({ product: p, onQuickView, index = 0 }) {
  const { favIds, toggleFavorite } = useStore();
  const fav = favIds.includes(p.id);
  const soldOut = p.stock <= 0;

  return (
    <motion.article className="pcard" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: Math.min(index % 4, 3) * 0.06 }}>
      <div className="pcard-media">
        <Link to={`/produto/${p.slug}`} aria-label={p.name} tabIndex={-1} style={{ position: 'absolute', inset: 0 }}>
          {p.image && <img src={p.image} alt={p.name} loading="lazy" />}
          {p.image_hover && <img className="alt" src={p.image_hover} alt="" loading="lazy" />}
        </Link>
        <div className="pcard-badges">
          {p.on_sale && <span className="badge badge-sale">-{p.discount_percent}%</span>}
          {p.is_new && <span className="badge badge-new">Novo</span>}
          {soldOut && <span className="badge badge-soft">Esgotado</span>}
        </div>
        <button className={`pcard-fav ${fav ? 'on' : ''}`} onClick={() => toggleFavorite(p.id)} aria-pressed={fav}
          aria-label={fav ? `Remover ${p.name} dos favoritos` : `Favoritar ${p.name}`}>
          <Heart size={18} />
        </button>
        {onQuickView && (
          <button className="pcard-quick" onClick={() => onQuickView(p)} aria-label={`Visualização rápida de ${p.name}`}>
            <Eye size={15} /> Visualização rápida
          </button>
        )}
      </div>
      <div className="pcard-body">
        {p.category_name && <span className="pcard-cat">{p.category_name}</span>}
        <Link to={`/produto/${p.slug}`} className="pcard-name">{p.name}</Link>
        <Price product={p} />
        <Swatches colors={p.colors} />
      </div>
    </motion.article>
  );
}
