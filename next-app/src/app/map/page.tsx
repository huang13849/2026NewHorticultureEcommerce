'use client';

export default function MapPage() {
  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white">
      <nav className="sticky top-0 z-50 bg-[#0a0e1a]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗺</span>
            <span className="text-gold font-bold tracking-[3px] text-xs">供应商地图</span>
          </div>
        </div>
      </nav>
      <div className="w-full" style={{ height: 'calc(100vh - 48px)' }}>
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
