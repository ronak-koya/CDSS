import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  // Patient users go to their own portal, not the staff app
  if (user.role === 'PATIENT') return <Navigate to="/portal" replace />;
  return <>{children}</>;
}

export function PatientPortalRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'PATIENT') return <Navigate to="/" replace />;
  return <>{children}</>;
}
