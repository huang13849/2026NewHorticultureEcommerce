'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('App error:', error);

  return (
    <main className="max-w-lg mx-auto min-h-screen flex flex-col items-center justify-center px-8 bg-white">
      <p className="text-6xl mb-4">🌸</p>
      <h1 className="text-2xl font-bold text-green-600">花伴</h1>
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mt-6 w-full text-center">
        <p className="text-red-500 font-medium">页面加载遇到问题</p>
        <p className="text-red-400 text-xs mt-2">
          {error?.message || '未知错误'}
        </p>
        <button
          onClick={reset}
          className="mt-4 bg-green-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
        >
          重新加载
        </button>
      </div>
    </main>
  );
}
