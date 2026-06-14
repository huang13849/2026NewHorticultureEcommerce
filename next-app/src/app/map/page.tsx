'use client';

export default function MapPage() {
  return (
    <main className="min-h-screen bg-white text-stone-900 pb-16">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/60">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗺</span>
            <span className="font-semibold tracking-tight text-sm text-stone-900">供应商地图</span>
          </div>
          <a href="/" className="text-xs text-emerald-700 font-medium hover:text-emerald-900 transition-colors">← 首页</a>
        </div>
      </nav>
      <div className="w-full" style={{ height: 'calc(100vh - 56px)' }}>
        <iframe
          src="http://100.76.15.64:29007/"
          className="w-full h-full border-0"
          title="供应商地图"
          allow="geolocation"
        />
      </div>
    </main>
  );
}
