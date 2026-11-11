import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { clearSession, getToken, TOKEN_KEY, USER_KEY } from '../api/client.js';

const AuthContext = createContext(null);

/**
 * Authentication state.
 * The token is kept in sessionStorage: it disappears when the tab closes and is not
 * shared across tabs. Trade-off (XSS-readable) documented in docs/04-security.md §6.
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getToken());
  const [user, setUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [university, setUniversity] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  const refreshMe = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return null;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setUniversity(data.university);
      sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data;
    } catch {
      clearSession();
      setToken(null);
      setUser(null);
      setUniversity(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post('/auth/login', { email, password });
      sessionStorage.setItem(TOKEN_KEY, data.token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      // Populate the linked university (name, wallet, authorization) right away — the
      // AuthProvider does not remount on navigation, so a fresh /auth/me is required.
      await refreshMe();
      return data.user;
    },
    [refreshMe]
  );

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
    setUniversity(null);
  }, []);

  const value = useMemo(
    () => ({ token, user, university, loading, login, logout, refreshMe, isAdmin: user?.role === 'admin', isUniversity: user?.role === 'university' }),
    [token, user, university, loading, login, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
