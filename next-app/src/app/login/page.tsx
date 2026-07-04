'use client';

// /login — 唯一入口: 触发 Zitadel SSO。老的手机+验证码登录已下线。
// club 和 space 都走同一条路: 点击按钮 → POST /api/auth/signin/zitadel → 跳 Zitadel。
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { startSSO } from '@/lib/sso';

function LoginInner() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string>('');

  // 自动触发: 打开页面 200ms 后直接跳 Zitadel。用户看到"跳转中"提示。
  useEffect(() => {
    const timer = setTimeout(() => {
      setRedirecting(true);
      startSSO(redirectTo).catch((e: unknown) => {
        setRedirecting(false);
        setError(e instanceof Error ? e.message : String(e));
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [redirectTo]);

  const manualClick = () => {
    setError('');
    setRedirecting(true);
    startSSO(redirectTo).catch((e: unknown) => {
      setRedirecting(false);
      setError(e instanceof Error ? e.message : String(e));
    });
  };

  return (
    <main className="min-h-screen bg-white text-stone-900 flex flex-col items-center justify-center px-8">
      <p className="text-6xl mb-4">🔐</p>
      <h1 className="text-3xl font-bold text-emerald-700">植物收藏家</h1>
      <p className="text-sm text-stone-500 mt-2 mb-8">Zitadel 单点登录 · 供应链新体验</p>

      {error && (
        <div className="w-full max-w-sm bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 border border-red-200">
          {error}
        </div>
      )}

      <button
        onClick={manualClick}
        disabled={redirecting}
        className="w-full max-w-sm flex items-center justify-center gap-2 bg-emerald-700 text-white py-3 rounded-xl text-lg font-bold hover:bg-emerald-800 transition-colors disabled:opacity-60"
      >
        <span>🔐</span>
        <span>{redirecting ? '跳转到 Zitadel...' : '使用 Zitadel 登录 / 注册'}</span>
      </button>

      <p className="text-xs text-stone-400 mt-6">首次登录会自动跳转; 若未跳转请点击上方按钮</p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white text-stone-900 flex items-center justify-center">
          <p className="text-sm text-stone-500">加载中...</p>
        </main>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
