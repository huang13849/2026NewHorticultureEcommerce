// next-app/src/app/components/ZitadelAuthBar.tsx
// Client component: 从 /api/auth/session 拿 next-auth session, 
// 显示登录状态 + 登录/登出按钮。
'use client';

import { useEffect, useState } from 'react';

type Session = { user?: { name?: string | null; email?: string | null; image?: string | null } } | null;

export default function ZitadelAuthBar() {
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'include' })
      .then(r => r.json())
      .then(j => setSession(j && j.user ? j : null))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  if (!session?.user) {
    return (
      <a
        href="/login"
        className="rounded-full border border-emerald-200 bg-white px-4 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
      >
        🔐 登录
      </a>
    );
  }

  const label = session.user.name || session.user.email || '已登录';

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">🌸 {label}</span>
      <a
        href="/api/auth/signout"
        className="rounded-full border border-stone-300 px-2 py-1 text-stone-600 hover:bg-stone-100"
      >
        登出
      </a>
    </div>
  );
}
