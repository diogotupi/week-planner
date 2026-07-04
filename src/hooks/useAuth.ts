import { useCallback, useState } from 'react';
import {
  clearSession,
  getDisplayName,
  getSession,
  setSession,
  validateLogin,
} from '../auth';

export function useAuth() {
  const [user, setUser] = useState<string | null>(getSession);

  const login = useCallback((username: string, password: string): boolean => {
    const valid = validateLogin(username, password);
    if (!valid) return false;
    setSession(valid.username);
    setUser(valid.username);
    return true;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return {
    user,
    displayName: user ? getDisplayName(user) : null,
    login,
    logout,
    isAuthenticated: user !== null,
  };
}
