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

// 高档庭院园林场景图片（Unsplash 免费授权）
const SUCCESS_STORIES = [
  {
    img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
    title: '北京别墅庭院改造',
    desc: '25棵白皮松 + 80棵月季，30天从裸地到花园',
    tag: '别墅庭院',
  },
  {
    img: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80',
    title: '天津婚礼花艺布置',
    desc: '2000支百合 + 500支玫瑰，48小时交付',
    tag: '婚礼花艺',
  },
  {
    img: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=80',
    title: '廊坊小区绿化工程',
    desc: '乔灌木混植 300棵，季度养护全包',
    tag: '社区绿化',
  },
  {
    img: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80',
    title: '顺义温室大棚供货',
    desc: '每周2000盆盆花稳定配送',
    tag: '商业供货',
  },
  {
    img: 'https://images.unsplash.com/photo-1598902108854-d1446b65d5f0?w=800&q=80',
    title: '保定陵园景观设计',
    desc: '常青树 + 时令花卉四季常青',
    tag: '园林景观',
  },
  {
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    title: '丰台阳台花园改造',
    desc: '2米空间打造微型花园',
    tag: '阳台花园',
  },
];

const REVIEWS = [
  { name: '张先生', loc: '北京朝阳', text: '白皮松成活率95%以上，一年后依然长势喜人，比花鸟市场靠谱多了！', stars: 5, avatar: '👷' },
  { name: '李女士', loc: '天津南开', text: '婚礼鲜花全程冷链，百合开得特别饱满，宾客都问在哪订的。', stars: 5, avatar: '👰' },
  { name: '王经理', loc: '廊坊开发区', text: '小区绿化一键下单，送货上门还包种植，物业费省了一大笔。', stars: 5, avatar: '👨‍💼' },
  { name: '赵总', loc: '顺义花卉市场', text: '每周稳定供货2000盆，品质统一，客户回头率明显提升。', stars: 5, avatar: '🧑‍🌾' },
  { name: '刘女士', loc: '保定', text: '陵园四季常青方案很专业，家属反馈很满意，会长期合作。', stars: 5, avatar: '👩‍💼' },
  { name: '陈先生', loc: '丰台', text: '2米阳台变成了小花园，老婆说这是今年最好的礼物！', stars: 5, avatar: '🧑' },
];

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

        {/* ✨ 成功案例 — 庭院园林场景 */}
        <section className="px-6 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-xs text-emerald-700 font-semibold tracking-widest uppercase mb-2">Success Stories</p>
              <h2 className="text-2xl md:text-3xl font-bold text-stone-900">庭院园林 · 成功案例</h2>
              <p className="text-sm text-stone-400 mt-2">从别墅庭院到阳台花园，每一个项目都用心交付</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {SUCCESS_STORIES.map((s, i) => (
                <div key={i} className="group rounded-2xl overflow-hidden border border-stone-200 bg-white hover:shadow-lg transition-all">
                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={s.img}
                      alt={s.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4">
                      <span className="inline-block bg-emerald-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full mb-1.5">{s.tag}</span>
                      <h3 className="text-white font-bold text-sm">{s.title}</h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-stone-500 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 💬 用户好评 */}
        <section className="px-6 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-xs text-amber-600 font-semibold tracking-widest uppercase mb-2">Customer Reviews</p>
              <h2 className="text-2xl md:text-3xl font-bold text-stone-900">客户好评</h2>
              <p className="text-sm text-stone-400 mt-2">来自真实采购商的声音</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {REVIEWS.map((r, i) => (
                <div key={i} className="rounded-2xl border border-stone-200 bg-white p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{r.avatar}</span>
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{r.name}</p>
                      <p className="text-[10px] text-stone-400">{r.loc}</p>
                    </div>
                    <div className="ml-auto flex gap-0.5">
                      {Array.from({ length: r.stars }).map((_, j) => (
                        <span key={j} className="text-amber-400 text-xs">★</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed">"{r.text}"</p>
                </div>
              ))}
            </div>
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
