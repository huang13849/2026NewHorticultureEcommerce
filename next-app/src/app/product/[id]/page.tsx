'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import TopNav from '../../components/v1/TopNav';
import Footer from '../../components/v1/Footer';
import Sparkline from '../../components/v1/Sparkline';
import { PRODUCT_DETAIL, TREND_ROSE_7D, getMarketInsight } from '@/lib/v1/data';

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const p = PRODUCT_DETAIL;
  const [grade, setGrade] = useState('A');
  const [size, setSize] = useState('19');
  const [origin, setOrigin] = useState('昆昆拿多');
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [showWhy, setShowWhy] = useState(false);
  const insight = getMarketInsight('玫瑰', -12);

  return (
    <div className="min-h-screen bg-stone-50/40 text-stone-900">
      <TopNav />

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-6 pt-6 text-xs text-stone-400">
        <Link href="/" className="hover:text-stone-700">首页</Link>
        {p.breadcrumb.slice(1).map((b, i) => (
          <span key={i}>
            <span className="mx-2 opacity-50">/</span>
            <span className="text-stone-600">{b}</span>
          </span>
        ))}
      </div>

      {/* 主区: 商品图 + 信息 */}
      <section className="max-w-6xl mx-auto px-6 pt-4 pb-10 grid lg:grid-cols-[1fr_1.1fr] gap-8">
        {/* 左侧 gallery */}
        <div className="grid grid-cols-[64px_1fr] gap-3">
          <div className="flex flex-col gap-2">
            {p.galleryEmojis.map((e, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`aspect-square rounded-xl border text-3xl flex items-center justify-center transition-all ${activeImg === i ? 'border-stone-900 bg-white' : 'border-stone-200 bg-stone-50 hover:border-stone-400'}`}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="aspect-square rounded-2xl bg-gradient-to-br from-rose-50 via-amber-50 to-emerald-50 flex items-center justify-center text-[180px] leading-none">
            {p.galleryEmojis[activeImg]}
          </div>
        </div>

        {/* 右侧 info */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{p.name}</h1>
          <div className="mt-2 text-sm text-stone-500">{p.scene}</div>
          <p className="mt-1 text-sm text-stone-400">{p.desc}</p>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-4xl font-black tabular-nums">¥{p.price}</span>
            <span className="rounded-full bg-red-50 text-red-700 text-xs font-medium px-2 py-0.5">今日 -12%</span>
            <span className="text-xs text-stone-400 ml-auto">市场参考价 ¥{p.marketPrice}/枝</span>
          </div>
          <div className="mt-1 text-[11px] text-stone-400">
            更新时间 {p.updatedAt} · {p.market}
          </div>

          {/* 等级 */}
          <div className="mt-6">
            <div className="text-xs text-stone-400 mb-2">花材等级</div>
            <div className="flex flex-wrap gap-2">
              {p.grades.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGrade(g.value)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${grade === g.value ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* 尺寸 */}
          <div className="mt-5">
            <div className="text-xs text-stone-400 mb-2">花束尺寸</div>
            <div className="flex flex-wrap gap-2">
              {p.sizes.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSize(s.value)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${size === s.value ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 产地 */}
          <div className="mt-5">
            <div className="text-xs text-stone-400 mb-2">产地</div>
            <div className="flex flex-wrap gap-2">
              {p.origins.map((o) => (
                <button
                  key={o}
                  onClick={() => setOrigin(o)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${origin === o ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'}`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* 发货 + 配送 */}
          <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-stone-400 inline-flex items-center gap-1">📍 {p.shop.name}</div>
              <div className="mt-1 font-medium">{p.shop.distance}</div>
              <button className="mt-1 text-xs text-emerald-700 hover:text-emerald-800">更换花店</button>
            </div>
            <div>
              <div className="text-xs text-stone-400 inline-flex items-center gap-1">⚡ 预计 {p.delivery.eta} 分钟送达</div>
              <div className="mt-1 font-medium">今天 {p.delivery.window}</div>
            </div>
            <div>
              <div className="text-xs text-stone-400 inline-flex items-center gap-1">📦 库存充足</div>
              <div className="mt-1 font-medium">当前可售 {p.stock} 束</div>
            </div>
          </div>

          {/* 为什么这个价格 */}
          <div className="mt-4 rounded-2xl border border-stone-200 bg-white">
            <button
              onClick={() => setShowWhy(!showWhy)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-stone-900"
            >
              <span className="inline-flex items-center gap-2">💡 为什么这个价格?</span>
              <span className={`text-stone-400 transition-transform ${showWhy ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {showWhy && (
              <div className="px-4 pb-4 text-sm text-stone-600 border-t border-stone-100 pt-3">
                {p.why}
                <div className="mt-2 text-xs text-stone-400">{insight}</div>
              </div>
            )}
          </div>

          {/* 数量 + CTA */}
          <div className="mt-6 flex items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-stone-200 bg-white">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 text-stone-500 hover:text-stone-900">−</button>
              <span className="px-3 tabular-nums text-sm font-medium">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="px-3 py-2 text-stone-500 hover:text-stone-900">+</button>
            </div>
            <button className="flex-1 rounded-full bg-stone-900 text-white text-sm font-medium py-2.5 hover:bg-emerald-800 transition-colors">立即购买</button>
            <button className="flex-1 rounded-full bg-white border border-stone-300 text-stone-900 text-sm font-medium py-2.5 hover:border-stone-500 transition-colors">加入购物车</button>
          </div>
        </div>
      </section>

      {/* 价格趋势 + 同款推荐 */}
      <section className="max-w-6xl mx-auto px-6 pb-10 grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="rounded-2xl bg-white border border-stone-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold tracking-tight">7 日价格趋势 · 玫瑰 (元/枝)</h3>
            <Link href="/market" className="text-xs text-stone-500 hover:text-stone-900">查看完整行情 →</Link>
          </div>
          <Sparkline data={TREND_ROSE_7D} height={160} />
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-stone-50 p-3">
              <div className="text-xs text-stone-400">今日市场价格</div>
              <div className="mt-1 font-bold tabular-nums">¥3.20/枝</div>
              <div className="text-[11px] text-red-600">↓ 12%</div>
            </div>
            <div className="rounded-xl bg-stone-50 p-3">
              <div className="text-xs text-stone-400">平台售价</div>
              <div className="mt-1 font-bold tabular-nums">¥4.80/枝</div>
              <div className="text-[11px] text-red-600">↓ 12%</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-stone-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold tracking-tight">同款推荐</h3>
            <Link href="/shop" className="text-xs text-stone-500 hover:text-stone-900">查看更多 →</Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {p.sameStyle.map((s) => (
              <Link key={s.id} href={`/product/${params?.id || '19-champagne-rose'}`} className="rounded-xl border border-stone-200 p-3 text-center hover:border-stone-400 transition-colors">
                <div className="aspect-square rounded-lg bg-stone-50 flex items-center justify-center text-4xl">{s.emoji}</div>
                <div className="mt-2 text-xs font-medium text-stone-700 truncate">{s.name}</div>
                <div className="mt-1 text-sm font-bold tabular-nums">¥{s.price}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* AI 也喜欢 */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <h3 className="text-xl font-bold tracking-tight">🤖 AI 推荐 · 可能你也喜欢</h3>
        <p className="mt-1 text-xs text-stone-400">价格和用户偏好推荐相似商品</p>
        <div className="mt-4 grid sm:grid-cols-3 gap-4">
          {p.aiAlsoLike.map((a) => (
            <Link key={a.id} href={`/product/${params?.id || '19-champagne-rose'}`} className="rounded-2xl bg-white border border-stone-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-[4/3] bg-gradient-to-br from-stone-50 to-rose-50/50 flex items-center justify-center text-6xl">{a.emoji}</div>
              <div className="p-4">
                <div className="font-medium text-stone-900">{a.name}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-bold tabular-nums">¥{a.price}</span>
                  <span className="text-xs text-stone-400 line-through tabular-nums">¥{a.marketPrice}</span>
                  <span className={`ml-auto text-xs font-medium tabular-nums ${a.change < 0 ? 'text-red-600' : 'text-emerald-600'}`}>↓ {Math.abs(a.change)}%</span>
                </div>
                <button className="mt-3 w-full rounded-full bg-stone-900 text-white text-sm py-2 hover:bg-emerald-800 transition-colors">立即购买</button>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
