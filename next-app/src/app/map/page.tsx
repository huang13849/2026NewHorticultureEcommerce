'use client';
import Head from 'next/head';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import { IS_CN } from '@/lib/deploy';

function MapContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') === 'dealer' ? 'dealer' : 'supplier';
  const [mapType, setMapType] = useState<'supplier' | 'dealer'>(initialType);

  useEffect(() => {
    document.title = IS_CN ? '地图 · 花伴' : 'Map · HuaBan';
    document
      .querySelectorAll("link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']")
      .forEach((el) => el.remove());
    const icon = document.createElement('link');
    icon.rel = 'icon';
    icon.href = '/map-icon.svg?v=2026062902';
    icon.type = 'image/svg+xml';
    document.head.appendChild(icon);
  }, []);

  useEffect(() => {
    const tp = searchParams.get('type');
    if (tp === 'dealer' || tp === 'supplier') setMapType(tp);
  }, [searchParams]);

  const supplierSrc = '/supplier-map/index.html?v=2026062904';
  const dealerSrc = '/dealer-map/index.html?v=2026062904';

  const tabBtn = (active: boolean) => ({
    padding: '6px 16px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    transition: 'all .15s',
    background: active ? '#1a1a2e' : 'transparent',
    color: active ? '#fff' : '#999',
  });

  return (
    <>
      <Head>
        <title>{IS_CN ? '地图 · 花伴' : 'Map · HuaBan'}</title>
        <link rel="icon" href="/map-icon.svg" type="image/svg+xml" />
      </Head>
      <main className="min-h-screen bg-white text-stone-900 pb-16">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/60">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗺</span>
            <span className="font-semibold tracking-tight text-sm text-stone-900">
              {mapType === 'supplier' ? (IS_CN ? '供应商地图' : 'Supplier Map') : (IS_CN ? '经销商地图' : 'Dealer Map')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-stone-100 rounded-full p-1">
              <button
                style={tabBtn(mapType === 'supplier')}
                onClick={() => setMapType('supplier')}
              >
                {IS_CN ? '🗺️ 供应商' : '🗺️ Supplier'}
              </button>
              <button
                style={tabBtn(mapType === 'dealer')}
                onClick={() => setMapType('dealer')}
              >
                {IS_CN ? '🏪 经销商' : '🏪 Dealer'}
              </button>
            </div>
            <a href="/" className="text-xs text-emerald-700 font-medium hover:text-emerald-900 transition-colors">
              {IS_CN ? '← 首页' : '← Home'}
            </a>
          </div>
        </div>
      </nav>
      <div className="relative w-full" style={{ height: 'calc(100vh - 56px)' }}>
        <iframe
          key={mapType}
          src={mapType === 'supplier' ? supplierSrc : dealerSrc}
          className="w-full h-full border-0"
          title={mapType === 'supplier' ? (IS_CN ? '供应商地图' : 'Supplier Map') : (IS_CN ? '经销商地图' : 'Dealer Map')}
          allow="geolocation"
        />
      </div>
      </main>
    </>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-stone-400">Loading...</div>}>
      <MapContent />
    </Suspense>
  );
}
