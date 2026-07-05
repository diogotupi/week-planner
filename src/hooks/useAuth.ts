import { useCallback, useEffect, useState } from 'react';
import {
  getDisplayName,
  restoreSession,
  signIn,
  signOut,
} from '../auth';

export function useAuth() {
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    restoreSession().then((sessionUser) => {
      if (!cancelled) {
        setUser(sessionUser);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await signIn(username, password);
    if (!result.user) {
      return { ok: false as const, error: result.error ?? 'Login ou senha incorretos.' };
    }
    setUser(result.user.username);
    return { ok: true as const };
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
  }, []);

  return {
    user,
    displayName: user ? getDisplayName(user) : null,
    login,
    logout,
    isAuthenticated: user !== null,
    loading,
  };
}
