'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, User, setToken, getToken } from './api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
});

interface SessionShape {
  flowerToken?: string | null;
  flowerUser?: User | null;
  expires?: string;
}

async function fetchSession(): Promise<SessionShape | null> {
  try {
    const r = await fetch('/api/auth/session', { credentials: 'include' });
    if (!r.ok) return null;
    return (await r.json()) as SessionShape;
  } catch {
    return null;
  }
}

function decodeFlowerToken(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    const role = payload.role || 'user';
    const isSuperAdmin = role === 'super_admin';
    return {
      id: payload.zid || '',
      phone: payload.phone || '',
      email: payload.email || '',
      nickname: isSuperAdmin ? '超级管理员' : (payload.nickname || (payload.phone ? `花友${String(payload.phone).slice(-4)}` : '')),
      avatar: isSuperAdmin ? '👑' : '',
      role,
      isAdmin: role === 'admin' || isSuperAdmin,
      isSuperAdmin,
      address: [],
    } as unknown as User;
  } catch { return null; }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      // 1. localStorage 有 flower_token 就用 (乐观还原)
      const local = getToken();
      if (local) {
        const optimistic = decodeFlowerToken(local);
        if (optimistic) setUser(optimistic);
      }

      // 2. 拉 NextAuth session (若已通过 Zitadel 登录, 里面会有 flowerToken)
      const sess = await fetchSession();
      if (cancelled) return;

      if (sess && sess.flowerToken) {
        setToken(sess.flowerToken);
        try { localStorage.setItem('flower_token', sess.flowerToken); } catch {}
        const u = sess.flowerUser as User | undefined;
        if (u) setUser(u);
        else setUser(decodeFlowerToken(sess.flowerToken));
      } else if (!local) {
        // 无 session 也无本地 -> 尝试 /auth/me (可能 flower_token 还在但 session 过期)
        setUser(null);
      } else {
        // 有本地 token 但 session 没了 -> 让 /auth/me 判
        try {
          const u = await api.getMe();
          if (!cancelled) setUser(u);
        } catch {
          if (!cancelled) {
            setToken(null);
            setUser(null);
            try { localStorage.removeItem('flower_token'); } catch {}
          }
        }
      }
      if (!cancelled) setLoading(false);
    }

    boot();

    return () => { cancelled = true; };
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('flower_token'); } catch {}
      // NextAuth signout + 广播清所有 cookie
      fetch('/api/auth/signout', { method: 'POST', credentials: 'include' }).catch(() => {});
      fetch('/api/auth/sso-logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
