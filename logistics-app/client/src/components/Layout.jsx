import { Outlet, NavLink } from 'react-router-dom';
import { useAuth, useLogout } from '../hooks/useAuth.js';

export default function Layout() {
  const { user, isAdmin, isFinance } = useAuth();
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-6">
          <span className="font-bold text-blue-700 text-lg tracking-tight">TAS Logistics</span>
          <nav className="flex gap-4 text-sm flex-1">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}>
              Buku
            </NavLink>
            {isFinance && (
              <NavLink to="/piutang" className={({ isActive }) => isActive ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}>
                Piutang
              </NavLink>
            )}
            {isFinance && (
              <NavLink to="/hutang" className={({ isActive }) => isActive ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}>
                Hutang
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/shippers" className={({ isActive }) => isActive ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}>
                Shippers
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/users" className={({ isActive }) => isActive ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}>
                Users
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/audit" className={({ isActive }) => isActive ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}>
                Audit Log
              </NavLink>
            )}
          </nav>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{user?.full_name || user?.username}</span>
            <button
              onClick={logout}
              className="text-xs border border-gray-200 rounded px-2 py-1 hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
