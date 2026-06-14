'use client';

import { useState, useEffect } from 'react';
import { api, Product } from '@/lib/api';
import TabBar from './TabBar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://100.76.15.64:3010/api';

// Smart image resolver: try multiple image fields
// The DB stores images in panorama_images, detail_images, package_images etc.
// but `images` is often empty
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

      // Supplement from products API to get items with images
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

      // Sort: products with any image first
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
