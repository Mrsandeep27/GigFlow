'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, User, clearApiCache } from './api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role: 'worker' | 'employer' }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveSession = (tok: string, refreshTok: string, u: User) => {
    localStorage.setItem('gf_token', tok);
    localStorage.setItem('gf_refresh', refreshTok);
    setToken(tok);
    setUser(u);
  };

  const clearSession = () => {
    localStorage.removeItem('gf_token');
    localStorage.removeItem('gf_refresh');
    setToken(null);
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.auth.me();
      setUser(me);
    } catch {
      clearSession();
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('gf_token');
    if (stored) {
      setToken(stored);
      api.auth.me()
        .then(setUser)
        .catch(clearSession)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login(email, password);
    saveSession(res.token, res.refreshToken, res.user);
  };

  const register = async (data: { name: string; email: string; password: string; role: 'worker' | 'employer' }) => {
    const res = await api.auth.register(data);
    saveSession(res.token, res.refreshToken, res.user);
  };

  const logout = () => {
    api.auth.logout().catch(() => {});
    clearApiCache();
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
