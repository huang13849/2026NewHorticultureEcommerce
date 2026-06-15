'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

type LoginMode = 'code' | 'password';

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [mode, setMode] = useState<LoginMode>('code');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('123456');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in, redirect
  if (user && !loading) {
    // Use setTimeout to avoid setState during render
    setTimeout(() => router.push('/'), 0);
    return (
      <main className="min-h-screen bg-white text-stone-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-sm text-stone-500">已登录，正在跳转...</p>
        </div>
      </main>
    );
  }

  const handleLogin = async () => {
    if (!phone || phone.length < 11) {
      setError('请输入正确的手机号');
      return;
    }
    if (mode === 'password' && !password) {
      setError('请输入密码');
      return;
    }
    if (mode === 'code' && !code) {
      setError('请输入验证码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await login(phone, mode === 'password' ? undefined : code, mode === 'password' ? password : undefined);
      console.log('[Login] Success:', result.nickname, result.role);
      // Ensure token persistence, then hard redirect so RootLayout rehydrates from storage/cookie.
      await new Promise(r => setTimeout(r, 150));
      window.location.href = '/';
    } catch (e: any) {
      console.error('[Login] Failed:', e.message);
      setError(e.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-stone-900 flex flex-col items-center justify-center px-8">
      <p className="text-6xl mb-4">🌸</p>
      <h1 className="text-3xl font-bold text-emerald-700">花伴</h1>
      <p className="text-sm text-stone-400 mt-2 mb-8">让每一朵花找到它的主人</p>

      {error && (
        <div className="w-full bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 border border-red-200">
          {error}
        </div>
      )}

      {/* Mode Toggle */}
      <div className="w-full flex rounded-xl border border-stone-200 mb-6 overflow-hidden">
        <button
          onClick={() => setMode('code')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === 'code' ? 'bg-emerald-700 text-white' : 'bg-white text-stone-500'}`}
        >
          验证码登录
        </button>
        <button
          onClick={() => setMode('password')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === 'password' ? 'bg-emerald-700 text-white' : 'bg-white text-stone-500'}`}
        >
          密码登录
        </button>
      </div>

      {/* Phone */}
      <input
        type="tel"
        placeholder="手机号"
        maxLength={11}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 transition-colors"
      />

      {mode === 'code' ? (
        <div className="w-full flex gap-2 mt-3">
          <input
            type="text"
            placeholder="验证码"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 border border-stone-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 transition-colors"
          />
          <button className="bg-emerald-700 text-white px-4 rounded-xl text-sm font-medium hover:bg-emerald-800 transition-colors whitespace-nowrap">
            获取验证码
          </button>
        </div>
      ) : (
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base mt-3 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 transition-colors"
        />
      )}

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full bg-emerald-700 text-white py-3 rounded-xl text-lg font-bold mt-6 hover:bg-emerald-800 transition-colors disabled:opacity-50"
      >
        {loading ? '登录中...' : '登录'}
      </button>

      <p className="text-xs text-stone-400 mt-4">
        {mode === 'code' ? '验证码输入 123456 即可登录' : '管理员使用手机号+密码登录'}
      </p>
    </main>
  );
}
