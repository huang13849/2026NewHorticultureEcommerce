'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, User, setToken, getToken } from './api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (phone: string, code?: string, password?: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => { throw new Error('Not initialized'); },
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      // 尝试 SSO 恢复: 若有 zitadel.session cookie, 换 flower JWT
      const hasZCookie = typeof document !== "undefined" && document.cookie.split(";").some(c => c.trim().startsWith("zitadel.session="));
      if (!hasZCookie) { setLoading(false); return; }
      (async () => {
        try {
          const r = await fetch("/api/auth/sso-restore", { method: "POST", credentials: "include" });
          if (!r.ok) { setLoading(false); return; }
          const j = await r.json();
          if (j.token) {
            setToken(j.token);
            if (typeof window !== "undefined") localStorage.setItem("flower_token", j.token);
            try { const u = await api.getMe(); setUser(u); } catch {}
          }
        } catch (e) { console.warn("[SSO restore] failed:", e); }
        finally { setLoading(false); }
      })();
      return;
    }

    // Optimistic restore from JWT payload so nav does not flash back to 登录.
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      if (payload?.phone) {
        setUser({
          id: payload.userId || '',
          phone: payload.phone,
          nickname: payload.role === 'super_admin' ? '超级管理员' : `花友${String(payload.phone).slice(-4)}`,
          avatar: payload.role === 'super_admin' ? '👑' : '',
          role: payload.role || 'user',
          isAdmin: payload.role === 'admin' || payload.role === 'super_admin',
          isSuperAdmin: payload.role === 'super_admin',
          address: [],
        } as User);
      }
    } catch { /* ignore optimistic decode errors */ }

    api.getMe()
      .then(u => {
        setUser(u);
      })
      .catch(err => {
        console.warn('[Auth] getMe failed, clearing token:', err.message);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (phone: string, code?: string, password?: string) => {
    const result = await api.login(phone, code, password);
    // Ensure token is persisted to localStorage before navigation
    setToken(result.token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('flower_token', result.token);
    }
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('flower_token');
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
