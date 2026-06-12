'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!phone || phone.length < 11) {
      setError('请输入正确的手机号');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(phone, code);
      router.push('/');
    } catch (e: any) {
      setError(e.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-lg mx-auto min-h-screen flex flex-col items-center justify-center px-8 bg-white">
      <p className="text-6xl mb-4">🌸</p>
      <h1 className="text-3xl font-bold text-green-600">花伴</h1>
      <p className="text-sm text-yellow-800 mt-2 mb-8">让每一朵花找到它的主人</p>

      {error && (
        <div className="w-full bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      <input
        type="tel"
        placeholder="手机号"
        maxLength={11}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
      />

      <div className="w-full flex gap-2 mt-3">
        <input
          type="text"
          placeholder="验证码"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
        <button className="bg-green-600 text-white px-4 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors whitespace-nowrap">
          获取验证码
        </button>
      </div>

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full bg-green-600 text-white py-3 rounded-xl text-lg font-bold mt-6 hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {loading ? '登录中...' : '登录'}
      </button>

      <p className="text-xs text-gray-400 mt-4">验证码输入 123456 即可登录</p>
    </main>
  );
}
