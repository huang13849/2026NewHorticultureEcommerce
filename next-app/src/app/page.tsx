'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import TopNav from './components/v1/TopNav';
import Footer from './components/v1/Footer';
import Sparkline from './components/v1/Sparkline';
import {
  MARKET_FLOWERS,
  TODAY_DEAL_PRODUCTS,
  TREND_ROSE_7D,
  HOT_FLOWERS,
  DELIVERY_AREAS,
} from '@/lib/v1/data';

export default function V1HomePage() {
  const [aiPrompt, setAiPrompt] = useState('给女朋友买生日花，预算300元');
  const [recipient, setRecipient] = useState('女朋友');
  const [deliveryWindow, setDeliveryWindow] = useState<'30分钟' | '60分钟' | '今天'>('30分钟');

  const lowPriceList = useMemo(() => MARKET_FLOWERS.slice(0, 4), []);

  return (
    <div className="min-h-screen bg-stone-50/40 text-stone-900">
      <TopNav />

      {/* ============ Hero + AI 推荐 ============ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-emerald-100/40 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 w-[320px] h-[320px] rounded-full bg-rose-100/30 blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 pt-10 pb-12 md:pt-16 md:pb-20">
          <div className="grid md:grid-cols-[1.4fr_1fr] gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 mb-5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                北京本地区域 · 现已开通
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-stone-900 leading-[1.1]">
                北京鲜花
                <br />
                <span className="text-emerald-700">价格跟着花走</span>
              </h1>
              <p className="mt-5 text-base md:text-lg text-stone-500">
                实时价格 · 当日鲜花 · 即时送达
              </p>

              <div className="mt-7 max-w-xl">
                <div className="flex items-center gap-2 text-[11px] text-stone-400 mb-2">
                  <span>预算输入触发 AI 推荐</span>
                </div>
                <form
                  onSubmit={(e) => { e.preventDefault(); window.location.href = '/ai-select?q=' + encodeURIComponent(aiPrompt); }}
                  className="flex items-center gap-2 bg-white rounded-2xl border border-stone-200 shadow-sm pl-4 pr-1.5 py-1.5"
                >
                  <span className="text-stone-400 text-sm">💬</span>
                  <input
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="给女朋友买生日花，预算300元"
                    className="flex-1 bg-transparent outline-none text-sm py-2 placeholder:text-stone-400"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 text-white text-sm font-medium px-4 py-2 hover:bg-emerald-800 transition-colors"
                  >
                    AI 帮精选
                    <span className="text-base leading-none">→</span>
                  </button>
                </form>
              </div>
            </div>

            {/* 装饰花束图（无图片资源时用渐变 + 大号 emoji 兜底） */}
            <div className="hidden md:flex justify-center">
              <div className="relative w-[320px] h-[320px]">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-100 via-emerald-50 to-amber-50" />
                <div className="absolute inset-0 flex items-center justify-center text-[180px] leading-none opacity-90">
                  💐
                </div>
                <div className="absolute -bottom-2 -right-2 inline-flex items-center gap-1.5 rounded-full bg-white border border-stone-200 px-3 py-1.5 text-xs font-medium shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  北京本地区域
                </div>
              </div>
            </div>
          </div>

          {/* 三张快速入口 */}
          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            <Link href="/shop?delivery=fast" className="group rounded-2xl bg-white border border-stone-200 p-5 hover:border-emerald-700 hover:shadow-md transition-all">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 text-lg">⚡</div>
              <div className="mt-3 font-bold text-stone-900">现在就送</div>
              <div className="mt-1 text-xs text-stone-500">最快 30 分钟送达</div>
              <div className="mt-3 text-stone-300 group-hover:text-emerald-700 transition-colors text-sm">→</div>
            </Link>
            <Link href="/market" className="group rounded-2xl bg-white border border-stone-200 p-5 hover:border-emerald-700 hover:shadow-md transition-all">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700 text-lg">💰</div>
              <div className="mt-3 font-bold text-stone-900">今日低价</div>
              <div className="mt-1 text-xs text-stone-500">掌握北京花卉实时价格</div>
              <div className="mt-3 text-stone-300 group-hover:text-emerald-700 transition-colors text-sm">→</div>
            </Link>
            <Link href="/market" className="group rounded-2xl bg-white border border-stone-200 p-5 hover:border-emerald-700 hover:shadow-md transition-all">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 text-lg">📈</div>
              <div className="mt-3 font-bold text-stone-900">查看花价</div>
              <div className="mt-1 text-xs text-stone-500">实时行情 · 价格趋势</div>
              <div className="mt-3 text-stone-300 group-hover:text-emerald-700 transition-colors text-sm">→</div>
            </Link>
          </div>
        </div>
      </section>

      {/* ============ 今日北京花市行情概要 ============ */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">今日北京花市</h2>
            <p className="text-xs text-stone-400 mt-1 inline-flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              14:32 更新 · 北京丰台花卉交易中心
            </p>
          </div>
          <Link href="/market" className="text-sm text-stone-500 hover:text-stone-900">查看全部 →</Link>
        </div>
        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
          {/* 行情表 */}
          <div className="rounded-2xl bg-white border border-stone-200 overflow-hidden">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_auto_auto] gap-2 px-5 py-3 text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-100 bg-stone-50/50">
              <span>花材</span>
              <span className="text-right">当前市场价</span>
              <span className="text-right">平台参考价</span>
              <span className="text-right w-16">涨跌</span>
              <span className="text-right w-16">时间</span>
            </div>
            {lowPriceList.map((f, i) => (
              <div key={i} className="grid grid-cols-[1.5fr_1fr_1fr_auto_auto] gap-2 px-5 py-3 text-sm border-b border-stone-100 last:border-b-0 hover:bg-stone-50/50 transition-colors">
                <span className="font-medium text-stone-900 inline-flex items-center gap-2">
                  <span>{f.emoji}</span>{f.name}
                </span>
                <span className="text-right tabular-nums">¥{f.marketPrice.toFixed(2)}/枝</span>
                <span className="text-right tabular-nums text-stone-500">¥{f.platformPrice.toFixed(2)}/枝</span>
                <span className={`text-right tabular-nums w-16 ${f.change < 0 ? 'text-red-600' : f.change > 0 ? 'text-emerald-600' : 'text-stone-500'}`}>
                  {f.change > 0 ? '↑' : f.change < 0 ? '↓' : '·'} {Math.abs(f.change)}%
                </span>
                <span className="text-right tabular-nums w-16 text-stone-400">{f.updatedAt}</span>
              </div>
            ))}
          </div>
          {/* 北京市场参考价卡 */}
          <Link href="/market" className="rounded-2xl bg-stone-900 text-white p-6 flex flex-col justify-between hover:bg-stone-800 transition-colors">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-stone-400">北京市场参考价</div>
              <div className="mt-2 text-lg font-semibold">平台实时调整</div>
              <p className="mt-3 text-sm text-stone-400">实时对接北京丰台花卉交易中心当日成交价，结合平台运营策略自动更新零售参考价。</p>
            </div>
            <div className="mt-4 inline-flex items-center gap-1 text-sm">
              查看花价详情 <span>→</span>
            </div>
          </Link>
        </div>
      </section>

      {/* ============ 今日低价推荐 ============ */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-xs text-stone-400 uppercase tracking-wider">北京花价行情 ↓</div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">今日低价</h2>
            <p className="mt-1 text-xs text-stone-400">实时挑出平台热门花材低价入手</p>
          </div>
          <Link href="/market" className="text-sm text-stone-500 hover:text-stone-900">更多 →</Link>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {TODAY_DEAL_PRODUCTS.map((p) => (
            <Link key={p.id} href="/product/19-champagne-rose" className="group rounded-2xl bg-white border border-stone-200 overflow-hidden hover:shadow-md transition-all">
              <div className="aspect-[4/3] bg-gradient-to-br from-stone-50 to-emerald-50/50 flex items-center justify-center text-7xl">
                {p.emoji}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900">{p.name}</span>
                  <span className="text-[11px] text-stone-400">{p.tag}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-xl font-black text-stone-900 tabular-nums">¥{p.price}</span>
                  <span className="text-xs text-stone-400 line-through tabular-nums">¥{p.marketPrice}</span>
                  <span className={`ml-auto text-xs font-medium tabular-nums ${p.change < 0 ? 'text-red-600' : 'text-emerald-600'}`}>↓ {Math.abs(p.change)}%</span>
                </div>
                <button className="mt-3 w-full rounded-full bg-stone-900 text-white text-sm py-2 hover:bg-emerald-800 transition-colors">立即购买</button>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ 现在想收到? (即时配送入口) ============ */}
      <section className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white border border-stone-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold tracking-tight">现在想收到?</h3>
              <p className="text-xs text-stone-400 mt-1">附近花店发货，最快即将送达</p>
            </div>
            <span className="text-[11px] text-stone-400">📍 北京 朝阳店</span>
          </div>
          <div className="mt-4 inline-flex items-center rounded-full bg-stone-100 p-1 text-sm">
            {(['30分钟', '60分钟', '今天'] as const).map((w) => (
              <button
                key={w}
                onClick={() => setDeliveryWindow(w)}
                className={`px-3 py-1 rounded-full transition-colors ${deliveryWindow === w ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
              >
                {w}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-stone-200 p-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-rose-50 flex items-center justify-center text-4xl">🌹</div>
            <div className="flex-1">
              <div className="font-semibold text-stone-900">红玫瑰花束</div>
              <div className="text-xs text-stone-400 mt-0.5">预计 {deliveryWindow === '30分钟' ? '45' : deliveryWindow === '60分钟' ? '60' : '今天'} 分钟送达</div>
              <div className="mt-1 text-lg font-bold tabular-nums">¥168</div>
            </div>
            <button className="rounded-full bg-stone-900 text-white text-sm px-4 py-2 hover:bg-emerald-800 transition-colors">立即送花</button>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-stone-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold tracking-tight inline-flex items-center gap-2">
                <span>🤖</span> AI 帮你选花
              </h3>
              <p className="text-xs text-stone-400 mt-1">告诉我们你的需求，AI 为你推荐最合适的花</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-stone-400 mb-2">送给谁</div>
            <div className="flex flex-wrap gap-2">
              {['女朋友', '妈妈', '姐姐', '朋友', '客户', '生日', '表白'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRecipient(r)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${recipient === r ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <Link href={`/ai-select?recipient=${encodeURIComponent(recipient)}`} className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-emerald-700 text-white text-sm font-medium px-5 py-2.5 hover:bg-emerald-800 transition-colors">
            开始选花 <span>→</span>
          </Link>
        </div>
      </section>

      {/* ============ 北京配送网络 ============ */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="rounded-2xl bg-white border border-stone-200 p-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 text-lg">🚚</span>
            <div>
              <h3 className="text-xl font-bold tracking-tight">北京配送网络</h3>
              <p className="text-xs text-stone-400 mt-0.5">覆盖北京主要区域，本地配送快速稳定</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {DELIVERY_AREAS.map((a) => (
              <span key={a} className="px-3 py-1.5 rounded-full text-sm bg-stone-50 text-stone-700 border border-stone-200">{a}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 价格趋势 + 热门花材 ============ */}
      <section className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-[1.6fr_1fr] gap-4">
        <div className="rounded-2xl bg-white border border-stone-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold tracking-tight">北京花价趋势 (近 7 天)</h3>
            <Link href="/market" className="text-xs text-stone-500 hover:text-stone-900">查看详情 →</Link>
          </div>
          <Sparkline data={TREND_ROSE_7D} height={140} />
          <div className="mt-2 text-[11px] text-stone-400">玫瑰 · 元/枝</div>
        </div>
        <div className="rounded-2xl bg-white border border-stone-200 p-6">
          <h3 className="font-bold tracking-tight">热门花材</h3>
          <p className="text-xs text-stone-400 mt-0.5">今日实时涨跌</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {HOT_FLOWERS.map((f) => (
              <Link key={f.name} href="/market" className="rounded-xl border border-stone-200 p-3 hover:border-stone-400 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{f.emoji}</span>
                  <span className={`text-xs font-medium tabular-nums ${f.change < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {f.change > 0 ? '↑' : '↓'} {Math.abs(f.change)}%
                  </span>
                </div>
                <div className="mt-2 text-sm font-medium text-stone-900">{f.name}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
