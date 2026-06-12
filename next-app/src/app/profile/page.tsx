'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import LoginPrompt from '../components/LoginPrompt';

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <main className="max-w-lg mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin text-3xl">👤</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="max-w-lg mx-auto">
        <LoginPrompt message="登录后查看个人中心 & 种花成就" />
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto">
      {/* 用户头部 */}
      <div className="bg-green-600 px-6 pt-8 pb-6 text-center rounded-b-2xl">
        <p className="text-5xl">{user.avatar || '🌸'}</p>
        <h1 className="text-xl font-bold text-white mt-2">{user.nickname}</h1>
        <p className="text-green-100 text-sm mt-1">{user.phone}</p>
      </div>

      {/* 收货地址 */}
      <section className="px-4 mt-5">
        <h2 className="text-lg font-bold text-gray-800 mb-3">收货地址</h2>
        {(!user.address || user.address.length === 0) ? (
          <p className="text-gray-400 text-sm text-center py-4">暂无收货地址</p>
        ) : (
          <div className="space-y-2">
            {user.address.map((addr, i) => (
              <div key={i} className="bg-white rounded-xl p-3">
                <p className="font-bold text-gray-800">
                  {addr.name} {addr.phone}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {addr.province}{addr.city}{addr.district}{addr.detail}
                </p>
                {addr.isDefault && (
                  <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded mt-1">
                    默认地址
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 种花成就 */}
      <section className="px-4 mt-5">
        <h2 className="text-lg font-bold text-gray-800 mb-3">种花成就</h2>
        <div className="flex gap-3">
          <div className="flex-1 bg-white rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {user.gardenStats?.totalPlanted || 0}
            </p>
            <p className="text-xs text-gray-400 mt-1">已种植</p>
          </div>
          <div className="flex-1 bg-white rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {user.gardenStats?.totalCompleted || 0}
            </p>
            <p className="text-xs text-gray-400 mt-1">已成熟</p>
          </div>
          <div className="flex-1 bg-white rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {user.gardenStats?.totalGifted || 0}
            </p>
            <p className="text-xs text-gray-400 mt-1">已获赠</p>
          </div>
        </div>
      </section>

      {/* 退出 */}
      <div className="px-4 mt-5 pb-4">
        <button
          onClick={logout}
          className="w-full bg-white text-red-500 py-3 rounded-xl border border-gray-200 font-medium hover:bg-red-50 transition-colors"
        >
          退出登录
        </button>
      </div>
    </main>
  );
}
