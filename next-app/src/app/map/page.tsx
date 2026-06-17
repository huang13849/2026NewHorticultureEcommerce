'use client';
import { useI18n } from '@/lib/i18n/context';
import LangSwitch from '@/app/components/LangSwitch';

export default function MapPage() {
  const { t } = useI18n();
  return (
    <main className="min-h-screen bg-white text-stone-900 pb-16">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/60">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗺</span>
            <span className="font-semibold tracking-tight text-sm text-stone-900">供应商地图</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-[11px] text-stone-400">点击地图商家 → 🎬 视频逛店</span>
            <a href="/supplier-videos?supplierId=6a11b8c84d0e2ad6e9a2b142&name=漳州圆山水仙花发展有限公司" className="text-xs bg-stone-900 text-white px-3 py-1.5 rounded-full font-bold hover:bg-emerald-800 transition-colors">🎬 视频逛店</a>
            <a href="/" className="text-xs text-emerald-700 font-medium hover:text-emerald-900 transition-colors">← 首页</a>
          </div>
        </div>
      </nav>
      <div className="relative w-full" style={{ height: 'calc(100vh - 56px)' }}>
        <div className="absolute left-4 top-4 z-10 bg-white/90 backdrop-blur rounded-xl shadow-md border border-stone-200 px-3 py-2 text-xs text-stone-600 sm:hidden">
          点商家标记，然后点 🎬 视频逛店
        </div>
        <iframe
          src="http://100.76.15.64:29007/?v=202606150236"
          className="w-full h-full border-0"
          title="供应商地图"
          allow="geolocation"
        />
      </div>
    </main>
  );
}
