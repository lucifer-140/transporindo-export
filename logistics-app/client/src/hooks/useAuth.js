import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';

export function useAuth() {
  const { data, isLoading } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api.get('/auth/me').then(r => r.data.user),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const user = data ?? null;
  return {
    user,
    loading: isLoading,
    isAdmin:   user?.role === 'admin',
    isFinance: user?.role === 'admin' || user?.role === 'finance',
  };
}

export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async (username, password) => {
    await api.post('/auth/login', { username, password });
    await queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    navigate('/');
  };
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await api.post('/auth/logout');
    queryClient.clear();
    navigate('/login');
  };
}
