'use client';

import { useState, useEffect } from 'react';
import { api, Product } from '@/lib/api';
import HeroAuction from './components/HeroAuction';
import TreeDNA from './components/TreeDNA';
import DarkMap from './components/DarkMap';
import AuctionHall from './components/AuctionHall';
import EstateShowcase from './components/EstateShowcase';
import TreePassport from './components/TreePassport';
import TabBar from './TabBar';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHomeRecommendations()
      .then(data => {
        const all = data.sections?.flatMap(s => s.products || []) || [];
        setProducts(all);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const featured = products[0];
  const others = products.slice(1, 7);

  return (
    <>
      <main className="min-h-screen bg-[#0a0e1a] text-white">
        {/* 顶部导航 */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0e1a]/80 backdrop-blur-md border-b border-white/5">
          <div className="max-w-6xl mx-auto px-8 h-12 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌳</span>
              <span className="text-gold font-bold tracking-[3px] text-xs">TREE ASSET EXCHANGE</span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-[11px] text-[#6b7280] tracking-[2px]">
              <a href="#hero" className="hover:text-[#c9a84c] transition-colors">拍卖</a>
              <a href="#dna" className="hover:text-[#c9a84c] transition-colors">DNA</a>
              <a href="#map" className="hover:text-[#c9a84c] transition-colors">地图</a>
              <a href="#estates" className="hover:text-[#c9a84c] transition-colors">庄园</a>
              <a href="#passport" className="hover:text-[#c9a84c] transition-colors">护照</a>
            </div>
            <button className="btn-ghost text-[11px] py-1.5 px-3">登录</button>
          </div>
        </nav>

        <div id="hero"><HeroAuction product={featured} loading={loading} /></div>
        <div className="hr" />
        <div id="dna"><TreeDNA product={featured} /></div>
        <div className="hr" />
        <div id="map"><DarkMap /></div>
        <div className="hr" />
        <AuctionHall products={others} loading={loading} />
        <div className="hr" />
        <div id="estates"><EstateShowcase /></div>
        <div className="hr" />
        <div id="passport"><TreePassport /></div>

        <footer className="py-10 px-8 border-t border-white/5">
          <div className="max-w-6xl mx-auto text-center">
            <div className="text-gold font-bold tracking-[3px] text-xs mb-1">TREE ASSET EXCHANGE</div>
            <div className="text-[10px] text-[#4b5563]">京津冀珍稀苗木拍卖中心 · © 2026</div>
          </div>
        </footer>
      </main>

      <TabBar />
    </>
  );
}
