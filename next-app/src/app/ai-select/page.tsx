'use client';

import Link from 'next/link';
import { useState } from 'react';
import TopNav from '../components/v1/TopNav';
import Footer from '../components/v1/Footer';
import { QUICK_SELECT, AI_PLANS } from '@/lib/v1/data';

export default function AISelectPage() {
  const [prompt, setPrompt] = useState('给女朋友买生日花，预算300元，今晚送到朝阳区');
  const [recipient, setRecipient] = useState('女朋友');
  const [budget, setBudget] = useState('¥300');
  const [scene, setScene] = useState('生日');
  const [area, setArea] = useState('朝阳区');
  const [deliveryTime, setDeliveryTime] = useState('今天');
  const [showResult, setShowResult] = useState(false);

  const handleRun = () => setShowResult(true);

  return (
    <div className="min-h-screen bg-stone-50/40 text-stone-900">
      <TopNav />

      {/* Header */}
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-4">
        <div className="inline-flex items-center gap-2 text-xs text-stone-500 bg-white border border-stone-200 rounded-full px-3 py-1">
          <span>🤖</span> 智能助手
        </div>
        <h1 className="mt-3 text-3xl md:text-4xl font-black tracking-tight">不知道买什么? 让 AI 帮你选花</h1>
        <p className="mt-2 text-sm text-stone-500 max-w-3xl">
          告诉我们你的需求，我会结合北京实时花价，库存和配送情况，为你推荐最合适的鲜花方案。
        </p>
      </section>

      {/* 输入区 */}
      <section className="max-w-6xl mx-auto px-6 pb-6">
        <div className="rounded-2xl bg-white border border-stone-200 p-5">
          <div className="flex items-center gap-2 text-xs text-stone-400 mb-2">
            <span>用户输入需求</span><span className="opacity-60">/</span><span>支持自然语言</span><span className="opacity-60">/</span><span>或快捷选项</span>
          </div>
          <div className="flex gap-2">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-stone-400"
            />
            <button onClick={handleRun} className="rounded-xl bg-stone-900 text-white px-5 text-sm font-medium hover:bg-emerald-800 transition-colors">↗</button>
          </div>
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <ChipGroup label="送给谁"  options={QUICK_SELECT.recipient}    value={recipient}    onChange={setRecipient} />
            <ChipGroup label="预算"    options={QUICK_SELECT.budget}       value={budget}       onChange={setBudget} />
            <ChipGroup label="场景"    options={QUICK_SELECT.scene}        value={scene}        onChange={setScene} />
            <ChipGroup label="配送区域" options={QUICK_SELECT.area}        value={area}         onChange={setArea} />
            <ChipGroup label="送达时间" options={QUICK_SELECT.deliveryTime} value={deliveryTime} onChange={setDeliveryTime} />
          </div>
        </div>
      </section>

      {/* 示例需求 */}
      <section className="max-w-6xl mx-auto px-6 pb-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-2xl bg-white border border-stone-200 p-5">
            <div className="text-xs text-stone-400 uppercase tracking-wider mb-3">示例需求</div>
            <p className="text-base text-stone-700">
              给女朋友买生日花<br />
              预算 300 元，今晚送到朝阳区
            </p>
          </div>
          <button onClick={handleRun} className="rounded-2xl bg-stone-900 text-white p-5 text-left hover:bg-stone-800 transition-colors">
            <div className="text-xs uppercase tracking-wider text-stone-400">点击运行</div>
            <div className="mt-2 text-lg font-semibold">▶ AI 帮精选</div>
          </button>
        </div>
      </section>

      {/* AI 推荐解析 */}
      {showResult && (
        <>
          <section className="max-w-6xl mx-auto px-6 pb-6">
            <div className="rounded-2xl bg-white border border-stone-200 p-6">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">🤖</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold tracking-tight">AI 为你推荐</h3>
                    <div className="text-[11px] text-stone-400 inline-flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" /> 当前市场行情
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                    根据您的需求: {recipient} + {scene} + 预算{budget} + {deliveryTime}送达{area}。
                    综合当前北京花卉行情、平台价格下浮 12%，您可以选择以下花材。
                    同时，{area}附近有 3 家合作花店可供调度，预计 40~60 分钟送达。
                  </p>
                  <div className="mt-4 rounded-xl bg-stone-50 p-4">
                    <div className="text-xs text-stone-400 mb-2">当前市场行情</div>
                    <div className="flex items-center gap-4 text-sm">
                      <span><span className="text-stone-900 font-bold tabular-nums">¥3.8/枝</span> 玫瑰</span>
                      <span className={`tabular-nums ${-12 < 0 ? 'text-red-600' : 'text-emerald-600'}`}>↓ 12%</span>
                      <span className="text-[11px] text-stone-400 ml-auto">北京丰台花卉交易中心 · 14:32 更新</span>
                    </div>
                    <Link href="/market" className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800">查看实时行情 →</Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 推荐方案 3 款 */}
          <section className="max-w-6xl mx-auto px-6 pb-6">
            <div className="flex items-end justify-between mb-4">
              <h3 className="text-xl font-bold tracking-tight">为你推荐 3 款方案</h3>
              <Link href="/shop" className="text-sm text-stone-500 hover:text-stone-900">查看全部方案 →</Link>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {AI_PLANS.map((p) => (
                <div key={p.id} className="relative rounded-2xl bg-white border border-stone-200 overflow-hidden hover:shadow-md transition-shadow">
                  {p.tag && <span className="absolute top-3 left-3 z-10 inline-flex items-center text-[11px] font-medium bg-emerald-600 text-white px-2 py-0.5 rounded-full">{p.tag}</span>}
                  <div className="aspect-[4/3] bg-gradient-to-br from-rose-50 via-amber-50 to-emerald-50 flex items-center justify-center text-7xl">{p.emoji}</div>
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">{p.name}</span>
                      <span className="text-[11px] text-stone-400">{p.scene}</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-xl font-black tabular-nums">¥{p.price}</span>
                      <span className="text-xs text-stone-400 line-through tabular-nums">¥{p.marketPrice}</span>
                      <span className={`ml-auto text-xs font-medium tabular-nums ${p.change < 0 ? 'text-red-600' : 'text-emerald-600'}`}>↓ {Math.abs(p.change)}%</span>
                    </div>
                    <ul className="mt-4 space-y-1.5 text-[12px] text-stone-600">
                      {p.reasons.map((r, i) => (
                        <li key={i} className="flex gap-1.5"><span className="text-emerald-600 mt-0.5">✓</span><span>{r}</span></li>
                      ))}
                    </ul>
                    <div className="mt-4 text-[11px] text-stone-400 space-y-0.5">
                      <div>📍 {p.delivery}</div>
                      <div>🚚 {p.eta}</div>
                      <div>📦 {p.stock}</div>
                    </div>
                    <Link href="/product/19-champagne-rose" className="mt-4 block w-full text-center rounded-full bg-stone-900 text-white text-sm py-2.5 hover:bg-emerald-800 transition-colors">选择这款</Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* 还可以这样调整 */}
      <section className="max-w-6xl mx-auto px-6 pb-6">
        <h3 className="text-base font-bold tracking-tight mb-3">你还可以这样调整:</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { icon: '💡', title: '更便宜一点', desc: '帮我找性价比更高的方案' },
            { icon: '🎁', title: '更有仪式感', desc: '加贺卡 / 礼盒 / 花卉升级' },
            { icon: '⚡', title: '30 分钟内送达', desc: '优先安排附近花店发货' },
          ].map((t) => (
            <button key={t.title} className="text-left rounded-2xl bg-white border border-stone-200 p-4 hover:border-stone-400 transition-colors">
              <div className="text-2xl">{t.icon}</div>
              <div className="mt-2 font-medium text-stone-900">{t.title}</div>
              <div className="mt-1 text-xs text-stone-400">{t.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* 4 步流程 */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="rounded-2xl bg-stone-900 text-white p-6">
          <div className="text-xs uppercase tracking-wider text-stone-400">从选定到收货</div>
          <h3 className="mt-1 text-xl font-bold">仅需 4 步</h3>
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            {[
              { idx: 1, title: 'AI 选花', desc: '根据需求匹配方案' },
              { idx: 2, title: '确认订单', desc: '选择花店和款式' },
              { idx: 3, title: '在线支付', desc: '支持微信和银行卡' },
              { idx: 4, title: '等待收货', desc: '实时物流跟踪' },
            ].map((s) => (
              <div key={s.idx} className="rounded-xl bg-white/10 p-4">
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-stone-900 text-xs font-bold">{s.idx}</div>
                <div className="mt-3 font-medium">{s.title}</div>
                <div className="mt-1 text-xs text-stone-400">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function ChipGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-stone-400 mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${value === o ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'}`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
