'use client';

import { Product } from '@/lib/api';

interface Props {
  product?: Product;
}

function Radar() {
  const dims = ['健康', '活力', '景观', '成活', '抗逆'];
  const vals = [95, 92, 94, 98, 90];
  const cx = 120, cy = 120, r = 85;

  const pts = vals.map((v, i) => {
    const a = (i * 72 - 90) * Math.PI / 180;
    const pr = (v / 100) * r;
    return `${cx + pr * Math.cos(a)},${cy + pr * Math.sin(a)}`;
  });

  return (
    <svg viewBox="0 0 240 240" className="w-full max-w-[260px] mx-auto">
      {[0.25, 0.5, 0.75, 1].map(s => (
        <polygon key={s}
          points={Array.from({ length: 5 }, (_, i) => {
            const a = (i * 72 - 90) * Math.PI / 180;
            return `${cx + r * s * Math.cos(a)},${cy + r * s * Math.sin(a)}`;
          }).join(' ')}
          fill="none" stroke="rgba(201,168,76,0.08)" strokeWidth="0.5" />
      ))}
      <polygon points={pts.join(' ')} fill="rgba(45,212,160,0.08)" stroke="rgba(45,212,160,0.5)" strokeWidth="1.5" />
      {vals.map((v, i) => {
        const a = (i * 72 - 90) * Math.PI / 180;
        return <circle key={i} cx={cx + (v / 100) * r * Math.cos(a)} cy={cy + (v / 100) * r * Math.sin(a)} r="3" fill="#2dd4a0" />;
      })}
      {dims.map((d, i) => {
        const a = (i * 72 - 90) * Math.PI / 180;
        return (
          <text key={i}
            x={cx + (r + 20) * Math.cos(a)} y={cy + (r + 20) * Math.sin(a)}
            textAnchor="middle" dominantBaseline="middle"
            fill="#9ca3af" fontSize="9">{d}</text>
        );
      })}
    </svg>
  );
}

function Bar({ label, value, max = 100, unit = '' }: { label: string; value: number; max?: number; unit?: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-[#9ca3af]">{label}</span>
        <span className="text-[#2dd4a0] font-semibold">{value}{unit}</span>
      </div>
      <div className="h-1 bg-[#1f2937] rounded-full">
        <div className="h-full rounded-full" style={{
          width: `${Math.min(value / max * 100, 100)}%`,
          background: 'linear-gradient(90deg, #059669, #2dd4a0)',
        }} />
      </div>
    </div>
  );
}

export default function TreeDNA({ product }: Props) {
  return (
    <section className="py-24 px-8">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-16">
          <div className="label mb-3">TREE DNA</div>
          <h2 className="text-3xl font-bold tracking-wide">树木数字档案</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* 左 — 雷达图 + 综合分 */}
          <div className="card p-10 text-center">
            <div className="text-[11px] text-[#6b7280] tracking-[3px] mb-1">综合评分</div>
            <div className="text-5xl font-bold text-gold mb-6">94.2</div>
            <Radar />
          </div>

          {/* 右 — 指标 */}
          <div className="space-y-6">
            <Bar label="AI 健康评分" value={95} unit=" / 100" />
            <Bar label="生长活力" value={92} unit="%" />
            <Bar label="成活率预测" value={98} unit="%" />
            <Bar label="景观价值指数" value={94} unit=" / 100" />
            <Bar label="抗逆能力" value={90} unit="%" />
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="card p-4 text-center">
                <div className="text-[11px] text-[#6b7280] mb-1">移栽风险</div>
                <div className="text-[#2dd4a0] font-bold">低风险</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-[11px] text-[#6b7280] mb-1">碳汇价值</div>
                <div className="text-gold font-bold">12.6 吨 CO₂</div>
              </div>
            </div>
          </div>
        </div>

        {/* 根系扫描 — 简化为三步 */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <div className="label mb-3">ROOT SCANNER</div>
            <h2 className="text-2xl font-bold tracking-wide">根系数字孪生</h2>
          </div>
          <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { step: '01', icon: '📸', title: '树冠采集', desc: '多角度高清影像' },
              { step: '02', icon: '🧠', title: 'AI 重建', desc: '深度学习根系推演' },
              { step: '03', icon: '🔬', title: '结构可视化', desc: '根盘·土球·主根深度' },
            ].map(s => (
              <div key={s.step} className="card p-6 text-center">
                <div className="text-[11px] text-[#6b7280] tracking-[2px] mb-3">STEP {s.step}</div>
                <div className="text-3xl mb-3">{s.icon}</div>
                <div className="font-medium text-white mb-1">{s.title}</div>
                <div className="text-xs text-[#6b7280]">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
