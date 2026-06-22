'use client';

import Link from 'next/link';

interface Props {
  message?: string;
}

export default function LoginPrompt({ message = '登录后即可使用完整功能' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-8">
      <p className="text-5xl mb-4">🌿</p>
      <h2 className="text-2xl font-bold text-green-600">植物收藏家</h2>
      <p className="text-sm text-yellow-800 mt-2 text-center">{message}</p>
      <Link
        href="/login"
        className="mt-6 bg-green-600 text-white px-8 py-3 rounded-xl text-lg font-bold hover:bg-green-700 transition-colors"
      >
        登录 / 注册
      </Link>
    </div>
  );
}
