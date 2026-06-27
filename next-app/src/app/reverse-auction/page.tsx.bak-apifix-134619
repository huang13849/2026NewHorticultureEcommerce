'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import TabBar from '../TabBar';
import { useI18n } from '@/lib/i18n/context';
import LangSwitch from '@/app/components/LangSwitch';
import PlantHunterLogo from '@/app/components/PlantHunterLogo';

interface Product {
  _id: string;
  title?: string;
  name?: string;
  flowerName?: string;
  category?: string;
  sellPrice?: number;
  settlementPrice?: number;
  price?: number;
  images?: string[];
  origin?: string;
  specSize?: string;
  sellerName?: string;
  [key: string]: unknown;
  stock?: number;
  tradeType?: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://100.76.15.64:3010/api';
const DROP_PER_MINUTE = 0.01;
const TICK_SECONDS = 10;
const MAGNIFIER = 100;
const ROUND_SECONDS = 30 * 60;

function basePrice(p: Product) {
  const value = Number(p.sellPrice || p.price || p.settlementPrice || 0);
  return Number.isFinite(value) ? value : 0;
}
function titleOf(p: Product) {
  return p.title || p.flowerName || p.name || '未命名鲜花';
}
function imgOf(p: Product) {
  const raw = (p.images as string[] | undefined)?.[0]
    || (p.panorama_images as string[] | undefined)?.[0]
    || (p.detail_images as string[] | undefined)?.[0]
    || (p.package_images as string[] | undefined)?.[0]
    || (p.scene_images as string[] | undefined)?.[0]
    || '';
  if (!raw) return '';
  if (raw.startsWith('http')) return raw;
  return `http://100.96.54.109:9000/supply-chain/${raw}`;
}
function isFlowerReverseItem(p: Product) {
  const hay = `${p.category || ''} ${p.title || ''} ${p.flowerName || ''} ${p.name || ''}`;
  return /鲜花|百合|切花|玫瑰|绣球|康乃馨|洋桔梗/.test(hay);
}
function computeReversePrice(p: Product, now: number) {
  const start = basePrice(p);
  const seed = [...String(p._id)].reduce((s, c) => s + c.charCodeAt(0), 0);
  const offset = (seed % 9) * 60;
  const elapsed = Math.floor((now / 1000 + offset) % ROUND_SECONDS);
  const elapsedMinutes = Math.floor(elapsed / 60);
  const secondsToNextDrop = 60 - (elapsed % 60);
  const current = Math.max(0.01, start - elapsedMinutes * DROP_PER_MINUTE);
  const progress = elapsed / ROUND_SECONDS;
  return {
    start,
    current: Number(current.toFixed(2)),
    dropAmount: Number((elapsedMinutes * DROP_PER_MINUTE).toFixed(2)),
    secondsToNextDrop,
    roundLeft: ROUND_SECONDS - elapsed,
    progress,
    amplifiedDrop: Math.round(elapsedMinutes * DROP_PER_MINUTE * MAGNIFIER),
  };
}
function fmtCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ReverseAuctionPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`${API}/products?limit=120`)
      .then(r => r.json())
      .then(data => {
        const list = (data.products || []).filter(isFlowerReverseItem).filter((p: Product) => basePrice(p) > 0);
        setProducts(list);
      })
      .catch(() => setMessage('鲜花倒拍加载失败，请稍后刷新'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_SECONDS * 1000);
    return () => clearInterval(id);
  }, []);

  const hot = useMemo(() => products.slice(0, 8), [products]);

  return (
    <>
      <main className="min-h-screen bg-white text-stone-900 pb-20">
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/60">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <PlantHunterLogo />
              <span className="text-stone-900 font-semibold tracking-tight text-sm">{t('reverseAuction.title')}</span>
            </Link>
            <Link href="/auction" className="text-xs text-emerald-700 font-medium hover:text-emerald-900 transition-colors">苗木正拍 →</Link>
          </div>
        </nav>

        <section className="max-w-6xl mx-auto px-6 pt-10 pb-8">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-amber-50 border border-stone-200/80 p-8 md:p-12">
            <div className="flex items-center gap-3 mb-3">
              <PlantHunterLogo size="md" />
              <p className="text-xs text-emerald-700 font-semibold tracking-widest uppercase">Reverse Auction · Flower Clock</p>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-stone-900 mb-4">百合 / 鲜花倒拍</h1>
            <p className="text-stone-500 leading-relaxed max-w-2xl text-sm md:text-base">
              鲜花越快成交越新鲜。当前盘面每 <b className="text-stone-800">10 秒</b> 刷新一次倒计时，
              每 <b className="text-emerald-700">1 分钟自动降价 ¥0.01</b>。降价优惠把"分"的变化放大展示，采购商能直观看到降价时钟在动。
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <div className="bg-white rounded-xl border border-stone-200 px-5 py-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-emerald-700">¥0.01</div>
                <div className="text-[10px] text-stone-400 mt-1">每分钟降</div>
              </div>
              <div className="bg-white rounded-xl border border-stone-200 px-5 py-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-amber-600">×100</div>
                <div className="text-[10px] text-stone-400 mt-1">{t('reverseAuction.dropDiscount')}</div>
              </div>
              <div className="bg-white rounded-xl border border-stone-200 px-5 py-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-stone-800">30m</div>
                <div className="text-[10px] text-stone-400 mt-1">{t('reverseAuction.round')}</div>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="text-3xl animate-pulse">⏳</div></div>
        ) : hot.length === 0 ? (
          <div className="text-center py-20 text-stone-400">暂无百合/鲜花倒拍拍品</div>
        ) : (
          <section className="max-w-6xl mx-auto px-6 pb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {hot.map(p => {
              const price = computeReversePrice(p, now);
              const img = imgOf(p);
              return (
                <article key={p._id} className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-44 bg-stone-100 relative flex items-center justify-center overflow-hidden">
                    {img ? <img src={img} alt={titleOf(p)} className="w-full h-full object-cover" /> : <span className="text-6xl opacity-20">🌷</span>}
                    <div className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse">{t('reverseAuction.live')}</div>
                    {p.category && <div className="absolute top-3 right-3 bg-white/90 text-stone-600 text-[10px] px-2 py-1 rounded-full border border-stone-200">{p.category}</div>}
                  </div>
                  <div className="p-5">
                    <h3 className="text-sm font-semibold truncate mb-1 text-stone-900">{titleOf(p)}</h3>
                    <div className="flex flex-wrap gap-2 text-[10px] text-stone-400 mb-3">
                      {p.origin && <span>📍{p.origin}</span>}
                      {p.specSize && <span>📏{p.specSize}</span>}
                      {p.sellerName && <span>🏷 {p.sellerName}</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-[10px] text-stone-400">开盘价</p>
                        <p className="text-sm text-stone-400 line-through">¥{price.start.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-emerald-700 font-medium">当前倒拍价</p>
                        <p className="text-2xl font-bold text-emerald-700">¥{price.current.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="bg-stone-50 rounded-xl p-3 mb-3 border border-stone-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-stone-400">下次降 ¥0.01</span>
                        <span className="font-mono text-lg font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">{fmtCountdown(price.secondsToNextDrop)}</span>
                      </div>
                      <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-amber-400 rounded-full transition-all" style={{ width: `${Math.min(100, price.progress * 100)}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-stone-400 mt-2">
                        <span>已降 ¥{price.dropAmount.toFixed(2)}</span>
                        <span>本轮剩余 {fmtCountdown(price.roundLeft)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-3 bg-amber-50 rounded-xl p-3 border border-amber-100">
                      <div>
                        <p className="text-[10px] text-stone-500 font-medium">{t('reverseAuction.dropDiscount')}</p>
                        <p className="text-[10px] text-stone-400">把分价变化放大成可见跳动</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-amber-600">-{price.amplifiedDrop}</div>
                        <div className="text-[10px] text-stone-400">已降金额</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setMessage(`${titleOf(p)} 已锁定当前倒拍价 ¥${price.current.toFixed(2)}，请联系供应商确认数量。`)}
                      className="w-full bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-semibold tracking-wide hover:bg-emerald-800 transition-colors"
                    >
                      锁定当前价
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {message && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] bg-white border border-emerald-200 rounded-xl px-5 py-3 text-sm text-emerald-800 shadow-lg">
            {message}
            <button onClick={() => setMessage('')} className="ml-3 text-stone-400 hover:text-stone-600">✕</button>
          </div>
        )}
      </main>
      <TabBar />
    </>
  );
}
