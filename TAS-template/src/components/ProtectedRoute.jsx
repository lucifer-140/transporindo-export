import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

const ROLE_LEVEL = { worker: 1, finance: 2, admin: 3 };

export default function ProtectedRoute({ minRole = 'worker', children }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;

  const userLevel = ROLE_LEVEL[user.role] ?? 0;
  const required  = ROLE_LEVEL[minRole] ?? 99;

  if (userLevel < required) {
    return (
      <div className="p-8 text-center text-red-600 font-medium">
        Access Denied — you do not have permission to view this page.
      </div>
    );
  }

  return children;
}
