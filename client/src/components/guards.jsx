import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner } from './ui.jsx';

const Loading = () => <div style={{ minHeight: '50vh', display: 'grid', placeItems: 'center' }}><Spinner /></div>;

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const { pathname, search } = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to={`/entrar?next=${encodeURIComponent(pathname + search)}`} replace />;
  return children;
}

export function RequireAdmin({ children }) {
  const { user, loading, isAdmin } = useAuth();
  const { pathname } = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to={`/entrar?next=${encodeURIComponent(pathname)}`} replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}
