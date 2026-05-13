const STUB_USER = { id: 1, username: 'admin', full_name: 'Admin', role: 'admin' };

export function useAuth() {
  return { user: STUB_USER, loading: false };
}

export function useLogin() {
  return async () => {};
}

export function useLogout() {
  return async () => {};
}
