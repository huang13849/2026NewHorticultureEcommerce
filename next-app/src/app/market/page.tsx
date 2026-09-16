'use client';

import Link from 'next/link';
import { useState } from 'react';
import TopNav from '../components/v1/TopNav';
import Footer from '../components/v1/Footer';
import Sparkline from '../components/v1/Sparkline';
import { MARKET_FLOWERS, TREND_ROSE_7D, AI_PICKS, AI_INSIGHT, PURCHASE_STEPS, getMarketInsight } from '@/lib/v1/data';

const CATEGORIES = ['全部', '玫瑰', '康乃馨', '向日葵', '绣球', '百合'];

export default function MarketPage() {
  const [category, setCategory] = useState('全部');
  const [market, setMarket] = useState('北京丰台花卉交易中心');
  const [source, setSource] = useState('市场实时报价 + 平台定价');

  const list = category === '全部' ? MARKET_FLOWERS : MARKET_FLOWERS.filter((f) => f.name === category);
  const insightRose = getMarketInsight('玫瑰', -12);

  return (
    <div className="min-h-screen bg-stone-50/40 text-stone-900">
      <TopNav />

      {/* 标题 + 选择器 */}
      <section className="max-w-6xl mx-auto px-6 pt-8 pb-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">北京花市实时行情</h1>
            <p className="mt-2 text-sm text-stone-500">实时更新 · 多市场对比 · 价格透明</p>
          </div>
          <div className="text-xs text-stone-400 inline-flex items-center gap-2">
            数据更新时间: <span className="text-stone-700 font-medium">14:32</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
        <div className="mt-5 grid sm:grid-cols-2 gap-3">
          <label className="block">
            <div className="text-[11px] uppercase tracking-wider text-stone-400 mb-1">市场 / 数据来源选择</div>
            <select value={market} onChange={(e) => setMarket(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm">
              <option>北京丰台花卉交易中心</option>
              <option>北京莱太花卉市场</option>
              <option>北京顺义鲜花港</option>
            </select>
          </label>
          <label className="block">
            <div className="text-[11px] uppercase tracking-wider text-stone-400 mb-1">数据来源</div>
            <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm">
              <option>市场实时报价 + 平台定价</option>
              <option>仅市场实时报价</option>
              <option>仅平台定价</option>
            </select>
          </label>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3.5 py-1.5 rounded-full text-sm border transition-colors ${category === c ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* 实时价格表 */}
      <section className="max-w-6xl mx-auto px-6 pt-4 pb-10">
        <div className="rounded-2xl bg-white border border-stone-200 overflow-hidden">
          <div className="grid grid-cols-[1.4fr_0.6fr_1fr_1fr_0.7fr_0.7fr] gap-2 px-5 py-3 text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-100 bg-stone-50/50">
            <span>花材</span>
            <span className="text-center">等级</span>
            <span className="text-right">当前市场价 (元/枝)</span>
            <span className="text-right">平台参考价 (元/枝)</span>
            <span className="text-right">涨跌</span>
            <span className="text-right">更新时间</span>
          </div>
          {list.map((f, i) => (
            <div key={i} className="grid grid-cols-[1.4fr_0.6fr_1fr_1fr_0.7fr_0.7fr] gap-2 px-5 py-3.5 text-sm border-b border-stone-100 last:border-b-0 hover:bg-stone-50/50 transition-colors">
              <span className="font-medium text-stone-900 inline-flex items-center gap-2">
                <span>{f.emoji}</span>{f.name}
              </span>
              <span className="text-center">
                <span className="inline-block px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-xs font-medium">{f.grade}</span>
              </span>
              <span className="text-right tabular-nums font-medium">¥{f.marketPrice.toFixed(2)}</span>
              <span className="text-right tabular-nums text-stone-500">¥{f.platformPrice.toFixed(2)}</span>
              <span className={`text-right tabular-nums ${f.change < 0 ? 'text-red-600' : f.change > 0 ? 'text-emerald-600' : 'text-stone-500'}`}>
                {f.change > 0 ? '↑' : f.change < 0 ? '↓' : '·'} {Math.abs(f.change)}%
              </span>
              <span className="text-right tabular-nums text-stone-400">{f.updatedAt}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 7日趋势 + AI 推荐 */}
      <section className="max-w-6xl mx-auto px-6 pb-10 grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="rounded-2xl bg-white border border-stone-200 p-6">
          <h3 className="font-bold tracking-tight">7 日价格趋势 · 玫瑰 (元/枝)</h3>
          <div className="mt-4">
            <Sparkline data={TREND_ROSE_7D} height={180} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-stone-50 p-3">
              <div className="text-xs text-stone-400">今日市场价</div>
              <div className="mt-1 font-bold tabular-nums">¥3.20/枝</div>
              <div className="text-[11px] text-red-600">↓ 12%</div>
            </div>
            <div className="rounded-xl bg-stone-50 p-3">
              <div className="text-xs text-stone-400">平台参考价</div>
              <div className="mt-1 font-bold tabular-nums">¥4.80/枝</div>
              <div className="text-[11px] text-red-600">↓ 12%</div>
            </div>
          </div>
          <Link href="/market" className="mt-4 inline-flex items-center gap-1 text-sm text-emerald-700 hover:text-emerald-800">查看完整行情 →</Link>
        </div>

        <div className="rounded-2xl bg-white border border-stone-200 p-6">
          <h3 className="font-bold tracking-tight inline-flex items-center gap-2"><span>🤖</span> 今天值得买什么 <span className="text-xs font-normal text-stone-400">AI 推荐</span></h3>
          <div className="mt-4 space-y-2">
            {AI_PICKS.map((p) => (
              <Link key={p.id} href="/product/19-champagne-rose" className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 hover:border-stone-400 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-stone-50 flex items-center justify-center text-3xl">{p.emoji}</div>
                <div className="flex-1">
                  <div className="font-medium text-stone-900">{p.name}</div>
                  <div className="text-[11px] text-stone-400">当前价 ¥{p.price}/枝 · 较昨日 <span className={p.change < 0 ? 'text-red-600' : 'text-emerald-600'}>↓ {Math.abs(p.change)}%</span></div>
                </div>
                <button className="text-sm rounded-full bg-stone-900 text-white px-3 py-1.5 hover:bg-emerald-800 transition-colors">去购买</button>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* AI 解析 */}
      <section className="max-w-6xl mx-auto px-6 pb-10">
        <div className="rounded-2xl bg-white border border-stone-200 p-6">
          <h3 className="font-bold tracking-tight inline-flex items-center gap-2">💡 {AI_INSIGHT.title} <span className="text-xs font-normal text-stone-400">(AI 解析)</span></h3>
          <div className="mt-4 grid md:grid-cols-[1.4fr_1fr] gap-6">
            <div>
              <p className="text-sm text-stone-700">{AI_INSIGHT.summary}</p>
              <ol className="mt-3 space-y-2 text-sm text-stone-600">
                {AI_INSIGHT.reasons.map((r, i) => (
                  <li key={i} className="flex gap-2"><span className="text-stone-400">{i + 1}.</span><span>{r}</span></li>
                ))}
              </ol>
            </div>
            <div className="rounded-xl bg-stone-50 p-4">
              <div className="text-xs text-stone-400 mb-2">今日市场情报</div>
              <ul className="space-y-2 text-sm">
                {AI_INSIGHT.marketNews.map((n, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-stone-700">{n.label} · <span className="text-stone-500">{n.detail}</span></span>
                  </li>
                ))}
                <li className="text-xs text-stone-400 mt-3">{insightRose}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 直接购买入口 + 4 步流程 */}
      <section className="max-w-6xl mx-auto px-6 pb-10">
        <div className="rounded-2xl bg-stone-900 text-white p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-xs text-stone-400 uppercase tracking-wider">从行情直接购买</div>
            <h3 className="mt-1 text-xl font-bold">选中花材，一键跳转至商品详情页</h3>
          </div>
          <Link href="/shop" className="inline-flex items-center gap-1.5 rounded-full bg-white text-stone-900 text-sm font-medium px-5 py-2.5 hover:bg-emerald-50 transition-colors">
            云选购 <span>→</span>
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {PURCHASE_STEPS.map((s) => (
            <div key={s.idx} className="rounded-2xl bg-white border border-stone-200 p-4 text-center">
              <div className="mx-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-white text-sm font-bold">{s.idx}</div>
              <div className="mt-3 font-medium text-stone-900">{s.title}</div>
              <div className="mt-1 text-[11px] text-stone-400">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
