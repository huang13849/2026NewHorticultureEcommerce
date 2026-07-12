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

// 跨站 SSO 兜底: 直接问 flower-api /api/auth/me-flower 读取 .horiculture.club/.horiculture.space
// cookie flower_token, 命中即视为登录, 不需要重跳 NextAuth OIDC.
async function fetchMeFlower(): Promise<User | null> {
  try {
    const r = await fetch('/api/auth/me-flower', { credentials: 'include' });
    if (!r.ok) return null;
    const j = await r.json();
    return (j && j.user) ? (j.user as User) : null;
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

// 跨顶级域 SSO Bridge: 已停用. club/space 域名/登录彻底隔离.
// 保留 cross-issue 后端端点用于其他系统(peony 等), 但前端不再自动跳转.
function shouldTryXBridge(): { peer: string } | null {
  return null; // 隔离国内/国际, 不再跨域桥接
}

function jumpToXBridge(peer: string): void {
  try {
    const cur = new URL(window.location.href);
    cur.searchParams.set('__xb', '1'); // 打标, 回来后不再触发
    const returnUrl = cur.toString();
    const target = new URL('/api/auth/cross-issue', peer);
    target.searchParams.set('return', returnUrl);
    window.location.replace(target.toString());
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      // Step 1: 先探 me-flower (读 .horiculture.club/.horiculture.space cookie).
      // 命中就直接登录, 兼容 peony/tropical/space 上的跨站 SSO. 没命中再走 NextAuth.
      const flowerUser = await fetchMeFlower();
      if (cancelled) return;
      if (flowerUser) {
        setUser(flowerUser);
        if (!cancelled) setLoading(false);
        return;
      }

      // Step 1.5: me-flower 401 -> 若是跨顶级域场景, 尝试一次 cross-bridge
      const xb = shouldTryXBridge();
      if (xb) {
        jumpToXBridge(xb.peer);
        return; // 页面已 replace, 后续 state 无意义
      }

      // Step 2: 无 flower_token cookie -> 落回 NextAuth session (OIDC 主流程)
      const sess = await fetchSession();
      if (cancelled) return;

      if (sess && sess.flowerToken) {
        setToken(sess.flowerToken);
        try { localStorage.setItem('flower_token', sess.flowerToken); } catch {}
        const u = sess.flowerUser as User | undefined;
        if (u) setUser(u);
        else setUser(decodeFlowerToken(sess.flowerToken));
      } else {
        // 无 NextAuth session -> 视为未登录, 清掉可能残留的旧 token
        setUser(null);
        setToken(null);
        try { localStorage.removeItem('flower_token'); } catch {}
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
      // NextAuth v5 signout 必须带 csrfToken 才能清 session cookie
      (async () => {
        try {
          const r = await fetch('/api/auth/csrf', { credentials: 'include' });
          const { csrfToken } = await r.json();
          const body = new URLSearchParams();
          body.set('csrfToken', csrfToken);
          body.set('callbackUrl', '/');
          await fetch('/api/auth/signout', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
            redirect: 'manual',
          });
        } catch {}
        try {
          await fetch('/api/auth/sso-logout', { method: 'POST', credentials: 'include' });
        } catch {}
        // 强制刷新, 让服务端根据被清掉的 cookie 重新渲染
        try { window.location.assign('/'); } catch {}
      })();
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
