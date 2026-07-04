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
      // 尝试 SSO 恢复: HttpOnly cookie JS 读不到, 无脑试, 让后端判
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
      .catch(async err => {
        console.warn('[Auth] getMe failed, trying SSO restore:', err.message);
        setToken(null);
        // 旧 token 失效 -> 试 zitadel.session cookie SSO 恢复
        try {
          const r = await fetch("/api/auth/sso-restore", { method: "POST", credentials: "include" });
          if (r.ok) {
            const j = await r.json();
            if (j.token) {
              setToken(j.token);
              if (typeof window !== "undefined") localStorage.setItem("flower_token", j.token);
              try { const u = await api.getMe(); setUser(u); } catch {}
            }
          }
        } catch (e) { console.warn("[SSO restore fallback] failed:", e); }
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // 跨标签登出联动: 页面重新可见时检查 SSO cookie 是否还在
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== "visible") return;
      // 检查 SSO 是否还有效 (调 sso-restore, 401 说明已登出)
      try {
        const r = await fetch("/api/auth/sso-restore", { method: "POST", credentials: "include" });
        if (r.status === 401) {
          // SSO 已失效 -> 清本地登录态
          setToken(null);
          setUser(null);
          if (typeof window !== "undefined") localStorage.removeItem("flower_token");
        } else if (r.ok) {
          // SSO 仍有效 -> 确保本地 token 在
          const j = await r.json();
          if (j.token && !getToken()) {
            setToken(j.token);
            if (typeof window !== "undefined") localStorage.setItem("flower_token", j.token);
            try { const u = await api.getMe(); setUser(u); } catch {}
          }
        }
      } catch {}
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
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
      // 广播: 清 zitadel.session cookie, tropical/peony 刷新即被登出
      fetch('/api/auth/sso-logout', { method: 'POST', credentials: 'include' }).catch(() => {});
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
