'use client';

import { formatPrice } from '@/lib/utils';
const estates = [
  { name: '安国玉簪庄园', area: '1200亩', years: 20, rating: 4.9, volume: '8600万', region: '河北' },
  { name: '神州花卉研究基地', area: '800亩', years: 15, rating: 4.8, volume: '5200万', region: '河北' },
  { name: '云南英茂花田', area: '2500亩', years: 25, rating: 4.9, volume: '1.2亿', region: '云南' },
  { name: '广东圣茵育种中心', area: '600亩', years: 18, rating: 4.7, volume: '3800万', region: '广东' },
];

export default function EstateShowcase() {
  const { region } = useRegion();
  return (
    <section className="py-24 px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="label mb-3">CERTIFIED ESTATES</div>
          <h2 className="text-3xl font-bold tracking-wide">认证苗木庄园</h2>
          <p className="text-[#6b7280] text-sm mt-3">每座庄园均经过严格审核与实地认证</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {estates.map((e, i) => (
            <div key={i} className="card p-6">
              <div className="flex items-center gap-3 mb-5">
                <h3 className="text-lg font-bold text-white">{e.name}</h3>
                <span className="badge text-[11px]">认证</span>
              </div>
              <div className="text-xs text-[#6b7280] mb-5">{e.region} · 从业 {e.years} 年</div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-[#6b7280] text-xs mb-1">庄园面积</div>
                  <div className="font-bold">{e.area}</div>
                </div>
                <div>
                  <div className="text-[#6b7280] text-xs mb-1">综合评分</div>
                  <div className="text-gold font-bold">⭐ {e.rating}</div>
                </div>
                <div>
                  <div className="text-[#6b7280] text-xs mb-1">成交金额</div>
                  <div className="text-[#2dd4a0] font-bold">{formatPrice(e.volume, region.code)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
