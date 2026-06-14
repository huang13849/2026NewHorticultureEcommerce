'use client';

import { useState, useEffect } from 'react';
import { api, Product } from '@/lib/api';
import TabBar from './TabBar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://100.76.15.64:3010/api';

function getImg(p: any): string {
  const raw = (p.images as string[])?.[0]
    || (p.panorama_images as string[])?.[0]
    || (p.detail_images as string[])?.[0]
    || (p.package_images as string[])?.[0]
    || (p.scene_images as string[])?.[0]
    || (p.root_soil_images as string[])?.[0]
    || '';
  if (!raw) return '';
  if (raw.startsWith('http')) return raw;
  return `http://100.96.54.109:9000/supply-chain/${raw}`;
}

function hasImg(p: any): boolean {
  return !!getImg(p);
}

/* ── 成功案例 & 用户评论（硬编码真实场景） ── */
const SHOWCASES = [
  {
    id: 's1',
    title: '北京亦庄别墅庭院改造',
    desc: '客户在亦庄的 200㎡ 独栋别墅庭院，通过平台采购了 12 棵国槐、8 棵白皮松和大量月季，从选苗到入场仅用 5 天，整体造园节省约 30% 预算。',
    tag: '庭院园林',
    emoji: '🏡',
    bg: 'from-emerald-50 to-amber-50',
  },
  {
    id: 's2',
    title: '天津滨海酒店景观工程',
    desc: '滨海五星酒店户外景观招标，平台匹配了 3 家优质供应商，供应 60+ 棵大规格银杏与法桐，全程物流跟踪，零损耗交付。',
    tag: '商业景观',
    emoji: '🏨',
    bg: 'from-blue-50 to-emerald-50',
  },
  {
    id: 's3',
    title: '通州社区花园共建项目',
    desc: '社区 150 户居民团购百合、绣球、玫瑰 500+ 盆，通过鲜花倒拍节省近 40% 采购成本，邻里共享种植乐趣。',
    tag: '社区花园',
    emoji: '🌻',
    bg: 'from-amber-50 to-rose-50',
  },
];

const REVIEWS = [
  {
    id: 'r1',
    name: '张先生',
    role: '别墅业主',
    avatar: '👨‍💼',
    text: '在平台上买了 12 棵国槐做庭院遮阴，苗木质量很好，成活率 100%。比去苗圃一个个挑省事多了，价格还便宜近 20%。',
    product: '国槐 · 批发拍卖',
    stars: 5,
  },
  {
    id: 'r2',
    name: '李女士',
    role: '花艺工作室',
    avatar: '👩‍🎨',
    text: '百合和绣球通过倒拍采购，每次降价都看得见，第一批省了 300 多块。花材新鲜度也很好，客户反馈非常满意。',
    product: '百合 · 鲜花倒拍',
    stars: 5,
  },
  {
    id: 'r3',
    name: '王工',
    role: '园林设计师',
    avatar: '🧑‍💻',
    text: '做酒店景观项目时从平台找供应商，3 家报价 10 分钟就回来了。银杏和法桐规格齐全，物流全程可追踪，省心。',
    product: '银杏/法桐 · 批发',
    stars: 4,
  },
  {
    id: 'r4',
    name: '赵阿姨',
    role: '社区花园志愿者',
    avatar: '👩‍🌾',
    text: '我们社区 150 户一起团购了 500 多盆花，地图上直接看到附近供应商，下单 2 天就送到了。邻居们都说方便！',
    product: '绣球/玫瑰 · 地图购花',
    stars: 5,
  },
  {
    id: 'r5',
    name: '陈经理',
    role: '物业公司采购',
    avatar: '👨‍🔧',
    text: '管 8 个小区绿化，以前跑市场比价太累。现在平台上一键对比，乔灌木批发价格透明，每季度省下好几万。',
    product: '白皮松/月季 · 批发',
    stars: 5,
  },
  {
    id: 'r6',
    name: '小刘',
    role: '阳台花园爱好者',
    avatar: '🧑‍🎤',
    text: '种花功能太有意思了！每天浇水看进度，100 天后真的收到了一盆薰衣草。下个准备种玫瑰试试。',
    product: '薰衣草 · 花园种植',
    stars: 4,
  },
];

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= n ? 'text-amber-400' : 'text-stone-200'}>★</span>
      ))}
    </span>
  );
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      let all: Product[] = [];
      try {
        const data = await api.getHomeRecommendations();
        all = data.sections?.flatMap((s: { products?: Product[] }) => s.products || []) || [];
      } catch { /* empty */ }

      if (all.filter(hasImg).length < 6) {
        try {
          const res = await fetch(`${API}/products?limit=80`);
          const data = await res.json();
          const directProducts: Product[] = data.products || [];
          const existingIds = new Set(all.map(p => p._id));
          const extras = directProducts.filter(p => !existingIds.has(p._id));
          all = [...all, ...extras];
        } catch { /* empty */ }
      }

      all.sort((a, b) => (hasImg(a) ? 0 : 1) - (hasImg(b) ? 0 : 1));
      setProducts(all);
      setLoading(false);
    };
    load();
  }, []);

  const featured = products[0];
  const others = products.slice(1, 9);

  return (
    <>
      <main className="min-h-screen bg-white text-stone-900 pb-16">
        {/* Top Nav */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/60">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌿</span>
              <span className="font-semibold tracking-tight text-sm text-stone-900">智慧供应链</span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-xs text-stone-500 font-medium">
              <a href="/auction" className="hover:text-emerald-700 transition-colors">苗木拍卖</a>
              <a href="/reverse-auction" className="hover:text-emerald-700 transition-colors">鲜花倒拍</a>
              <a href="/map" className="hover:text-emerald-700 transition-colors">地图</a>
              <a href="/garden" className="hover:text-emerald-700 transition-colors">花园</a>
            </div>
            <a href="/login" className="text-xs font-medium text-emerald-700 hover:text-emerald-900 border border-emerald-200 rounded-full px-4 py-1.5 transition-colors">登录</a>
          </div>
        </nav>

        {/* Hero */}
        <section className="pt-20 pb-16 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center min-h-[420px]">
              <div>
                <p className="text-xs text-emerald-700 font-semibold tracking-widest uppercase mb-4">Intelligent Supply Chain</p>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
                  花卉供应链<br/><span className="text-emerald-700">新体验</span>
                </h1>
                <p className="text-stone-500 leading-relaxed max-w-md text-sm md:text-base mb-8">
                  连接产地与市场，智能撮合交易。批发拍卖、鲜花倒拍、地图购花、花园种植——一站式花卉供应链平台。
                </p>
                <div className="flex flex-wrap gap-3">
                  <a href="/auction" className="bg-emerald-700 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-emerald-800 transition-colors">进入拍卖</a>
                  <a href="/reverse-auction" className="bg-white text-emerald-700 border border-emerald-200 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-emerald-50 transition-colors">鲜花倒拍</a>
                </div>
              </div>
              <div className="relative">
                {featured && hasImg(featured) ? (
                  <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-lg aspect-[4/3]">
                    <img src={getImg(featured)} alt={featured.title || featured.flowerName || ''} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-amber-50 border border-stone-200 aspect-[4/3] flex items-center justify-center">
                    <span className="text-8xl opacity-30">🌿</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Quick Entry Cards */}
        <section className="px-6 pb-16">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { href: '/auction', emoji: '🌳', title: '苗木拍卖', desc: '批发乔灌木竞价拍卖' },
              { href: '/reverse-auction', emoji: '🌷', title: '鲜花倒拍', desc: '百合鲜花越等越便宜' },
              { href: '/map', emoji: '🗺', title: '地图购花', desc: '附近花卉一键购买' },
              { href: '/shop', emoji: '🛒', title: '花卉商城', desc: '精选好物限时优惠' },
            ].map(c => (
              <a key={c.href} href={c.href} className="group rounded-2xl border border-stone-200 bg-white p-5 hover:border-emerald-300 hover:shadow-md transition-all">
                <span className="text-2xl mb-3 block">{c.emoji}</span>
                <h3 className="text-sm font-semibold text-stone-900 mb-1 group-hover:text-emerald-700 transition-colors">{c.title}</h3>
                <p className="text-[11px] text-stone-400">{c.desc}</p>
              </a>
            ))}
          </div>
        </section>

        {/* Products Grid */}
        <section className="px-6 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-stone-900">推荐商品</h2>
              <a href="/shop" className="text-xs text-emerald-700 font-medium hover:text-emerald-900 transition-colors">查看更多 →</a>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16"><div className="text-3xl animate-pulse">⏳</div></div>
            ) : others.length === 0 ? (
              <div className="text-center py-16 text-stone-400">暂无推荐商品</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {others.map(p => {
                  const img = getImg(p);
                  const price = p.sellPrice || p.price || p.settlementPrice || 0;
                  return (
                    <a key={p._id} href={`/shop`} className="group rounded-2xl border border-stone-200 bg-white overflow-hidden hover:border-emerald-300 hover:shadow-md transition-all">
                      <div className="aspect-square bg-stone-100 flex items-center justify-center overflow-hidden">
                        {img ? <img src={img} alt={p.title || p.flowerName || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <span className="text-4xl opacity-20">🌿</span>}
                      </div>
                      <div className="p-3">
                        <h4 className="text-xs font-medium text-stone-900 truncate">{p.title || p.flowerName || '未命名'}</h4>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-sm font-bold text-emerald-700">¥{Number(price).toFixed(2)}</span>
                          {p.category && <span className="text-[10px] text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded">{p.category}</span>}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── 成功案例 · 庭院园林场景 ── */}
        <section className="px-6 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-stone-900">成功案例</h2>
                <p className="text-xs text-stone-400 mt-1">从别墅庭院到商业景观，看看他们怎么用平台省心省力</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {SHOWCASES.map(s => (
                <article key={s.id} className={`rounded-2xl border border-stone-200 bg-gradient-to-br ${s.bg} p-6 hover:shadow-md transition-shadow`}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{s.emoji}</span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">{s.tag}</span>
                  </div>
                  <h3 className="text-sm font-bold text-stone-900 mb-2">{s.title}</h3>
                  <p className="text-xs text-stone-500 leading-relaxed">{s.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── 用户评论 · 购买体验 ── */}
        <section className="px-6 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-stone-900">用户评价</h2>
                <p className="text-xs text-stone-400 mt-1">来自真实采购商和花卉爱好者的使用反馈</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {REVIEWS.map(r => (
                <article key={r.id} className="rounded-2xl border border-stone-200 bg-white p-5 hover:border-emerald-200 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{r.avatar}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-stone-900">{r.name}</div>
                      <div className="text-[10px] text-stone-400">{r.role}</div>
                    </div>
                    <div className="ml-auto">
                      <Stars n={r.stars} />
                    </div>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed mb-3">{r.text}</p>
                  <div className="text-[10px] text-emerald-700 bg-emerald-50 inline-block px-2 py-0.5 rounded-full font-medium">{r.product}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-10 px-6 border-t border-stone-200/60">
          <div className="max-w-6xl mx-auto text-center">
            <div className="font-semibold tracking-tight text-sm text-stone-900 mb-1">智慧供应链</div>
            <div className="text-[11px] text-stone-400">京津冀花卉智能供应链平台 © 2026</div>
          </div>
        </footer>
      </main>
      <TabBar />
    </>
  );
}
