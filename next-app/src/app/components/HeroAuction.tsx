'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/lib/api';

interface Props {
  product?: Product;
  loading: boolean;
}

export default function HeroAuction({ product, loading }: Props) {
  const [t, setT] = useState({ h: 0, m: 12, s: 45 });
  const pad = (n: number) => String(n).padStart(2, '0');

  useEffect(() => {
    const id = setInterval(() => {
      setT(p => {
        let { h, m, s } = p;
        if (--s < 0) { s = 59; if (--m < 0) { m = 59; if (--h < 0) { h = 0; m = 0; s = 0; } } }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const name = product?.title || product?.flowerName || '百年国槐';
  const price = product?.sellPrice || product?.price || 28600;
  const origin = product?.origin || '河北保定';
  const spec = product?.specSize || '';
  const treeAge = name.includes('百年') ? 100 : name.includes('古') ? 80 : 35;
  const height = name.includes('楝') ? 12 : 8.5;
  const dbh = 28;

  return (
    <section className="min-h-screen flex items-center relative">
      {/* 背景微光 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e1a] via-[#0d1220] to-[#0a0e1a]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(45,212,160,0.03)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-8 py-32">
        {/* Lot 编号 */}
        <div className="label mb-8">LOT 202606001</div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* 左 — 信息 (5列) */}
          <div className="lg:col-span-5 space-y-8">
            <h1 className="text-5xl lg:text-6xl font-bold tracking-wide text-gold leading-tight">{name}</h1>

            <div className="space-y-4 text-sm">
              {[
                ['树龄', `${treeAge}年`],
                ['高度', `${height}米`],
                ['胸径', `${dbh}厘米`],
                ...(spec ? [['规格', spec]] : []),
                ['产地', origin],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-white/5 pb-3">
                  <span className="text-[#6b7280]">{k}</span>
                  <span className="text-white font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 中 — 树 (2列) */}
          <div className="lg:col-span-2 flex justify-center">
            <div className="animate-float text-[120px] leading-none select-none" style={{ filter: 'drop-shadow(0 0 30px rgba(45,212,160,0.15))' }}>
              🌳
            </div>
          </div>

          {/* 右 — 竞拍 (5列) */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <div className="text-[11px] text-[#6b7280] tracking-[3px] mb-2">当前价格</div>
              <div className="text-4xl lg:text-5xl font-bold text-gold">
                ¥{typeof price === 'number' ? price.toLocaleString() : price}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-[#6b7280] tracking-[3px] mb-3">竞拍倒计时</div>
              <div className="flex gap-2 items-center">
                <span className="cd">{pad(t.h)}</span>
                <span className="text-[#c9a84c] text-lg">:</span>
                <span className="cd">{pad(t.m)}</span>
                <span className="text-[#c9a84c] text-lg">:</span>
                <span className="cd">{pad(t.s)}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button className="btn-primary w-full">立即竞拍</button>
              <div className="flex gap-3">
                <button className="btn-ghost flex-1">预约看树</button>
                <button className="btn-ghost flex-1">♡ 收藏</button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#6b7280]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2dd4a0]" />
              23 人关注
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
