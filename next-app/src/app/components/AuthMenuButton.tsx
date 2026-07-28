'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/context';
import { startSSO, isInternationalHost } from '@/lib/sso';

type Props = {
  className?: string;
  dark?: boolean;
  loginRedirect?: string;
};

export default function AuthMenuButton({ className = '', dark = false, loginRedirect }: Props) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const redirect = loginRedirect || (typeof window !== 'undefined' ? window.location.pathname : '/');
  const loginHref = `/login?redirect=${encodeURIComponent(redirect)}`;
  const shell = dark
    ? 'border-white/15 bg-white/10 text-white hover:bg-white/15'
    : 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50';
  const menu = dark
    ? 'border-white/10 bg-stone-950/95 text-white shadow-black/40'
    : 'border-stone-200 bg-white text-stone-900 shadow-stone-900/10';

  const label = useMemo(() => {
    if (!user) return t('common.login');
    return user.nickname || user.phone || '已登录';
  }, [user]);

  if (!user) {
    // 国际版：点"登录"直接触发 Zitadel SSO，不落到本地 phone+code 页面。
    if (isInternationalHost()) {
      return (
        <div className={`flex items-center gap-1.5 ${className}`}>
          <button
            type="button"
            onClick={() => { void startSSO(redirect); }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-bold transition-colors ${shell}`}
          >
            <span>🔐</span><span>{t('common.login')}</span>
          </button>
          <a
            href={`/register?redirect=${encodeURIComponent(redirect)}`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${dark ? 'border-white/25 bg-white/20 text-white hover:bg-white/30' : 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'}`}
          >
            <span>✨</span><span>{t('common.register')}</span>
          </a>
        </div>
      );
    }
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <a href={loginHref} className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-bold transition-colors ${shell}`}>
          <span>👤</span><span>{t('common.login')}</span>
        </a>
        <a
          href={`/register?redirect=${encodeURIComponent(redirect)}`}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${dark ? 'border-white/25 bg-white/20 text-white hover:bg-white/30' : 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'}`}
        >
          <span>✨</span><span>{t('common.register')}</span>
        </a>
      </div>
    );
  }

  const isAdmin = !!(user.isAdmin || user.isSuperAdmin);
  const isSuper = !!user.isSuperAdmin;

  return (
    <div className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen(v => !v)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${shell}`}>
        <span>{user.avatar || '🌸'}</span><span className="max-w-[8rem] truncate">{label}</span><span className="text-[10px] opacity-70">▾</span>
      </button>
      {open && (
        <div className={`absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 overflow-hidden rounded-2xl border py-2 text-xs shadow-2xl ${menu}`}>
          <div className="px-3 pb-2 pt-1 opacity-70">
            <div className="truncate">{user.phone}</div>
            {isAdmin && <div className="mt-1 font-bold text-emerald-400">{isSuper ? '👑 超级管理员' : '管理员'}</div>}
          </div>
          <a href="/profile" className="block px-3 py-2 hover:bg-emerald-500/10">🌸 个人中心 / Profile</a>
          {isAdmin && (
            <>
              <div className="my-1 border-t border-white/10 opacity-40" />
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider opacity-50">管理后台</div>
              <a href="/admin" className="block px-3 py-2 hover:bg-emerald-500/10">🎛 管理后台</a>
              {isSuper && (
                <a href="http://100.96.54.109:8088/" target="_blank" rel="noreferrer" className="block px-3 py-2 hover:bg-emerald-500/10">🌺 供应链平台 ↗</a>
              )}
            </>
          )}
          <div className="my-1 border-t border-white/10 opacity-40" />
          <button type="button" onClick={() => { logout(); setOpen(false); }} className="block w-full px-3 py-2 text-left text-rose-400 hover:bg-rose-500/10">退出登录</button>
        </div>
      )}
    </div>
  );
}
