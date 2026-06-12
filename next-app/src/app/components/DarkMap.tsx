'use client';

import { useState, useEffect, useRef } from 'react';

interface MapNode {
  id: string; name: string; x: number; y: number; count: number; score: number; bids: number;
}

const nodes: MapNode[] = [
  { id: 'baoding', name: '保定', x: 42, y: 32, count: 128, score: 4.8, bids: 12 },
  { id: 'beijing', name: '北京', x: 55, y: 25, count: 86, score: 4.9, bids: 23 },
  { id: 'tianjin', name: '天津', x: 62, y: 30, count: 64, score: 4.7, bids: 8 },
  { id: 'shijiazhuang', name: '石家庄', x: 38, y: 40, count: 95, score: 4.6, bids: 6 },
  { id: 'kunming', name: '昆明', x: 28, y: 72, count: 210, score: 4.9, bids: 34 },
  { id: 'dongguan', name: '东莞', x: 60, y: 80, count: 72, score: 4.7, bids: 5 },
];

export default function DarkMap() {
  const [selected, setSelected] = useState<MapNode | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  return (
    <section className="py-24 px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="label mb-3">MAP</div>
          <h2 className="text-3xl font-bold tracking-wide">地图找树</h2>
          <p className="text-[#6b7280] text-sm mt-3">全国认证苗木分布 · 实时竞拍状态</p>
        </div>

        <div className="card p-8">
          <svg ref={svgRef} viewBox="0 0 100 100" className="w-full" style={{ maxHeight: 480 }}>
            {/* 网格 */}
            {Array.from({ length: 10 }, (_, i) => (
              <g key={i}>
                <line x1={i * 10} y1="0" x2={i * 10} y2="100" stroke="rgba(201,168,76,0.03)" strokeWidth="0.1" />
                <line x1="0" y1={i * 10} x2="100" y2={i * 10} stroke="rgba(201,168,76,0.03)" strokeWidth="0.1" />
              </g>
            ))}

            {/* 连接线 */}
            {nodes.map((n, i) => nodes.slice(i + 1).map(m => {
              const d = Math.hypot(n.x - m.x, n.y - m.y);
              if (d > 35) return null;
              return <line key={`${n.id}-${m.id}`} x1={n.x} y1={n.y} x2={m.x} y2={m.y} stroke="rgba(201,168,76,0.06)" strokeWidth="0.15" />;
            }))}

            {/* 节点 */}
            {nodes.map(n => (
              <g key={n.id} onClick={() => setSelected(selected?.id === n.id ? null : n)} className="cursor-pointer">
                <circle cx={n.x} cy={n.y} r="3" fill="rgba(201,168,76,0.1)" />
                <circle cx={n.x} cy={n.y} r="1.2" fill="#c9a84c" />
                <text x={n.x} y={n.y - 3.5} textAnchor="middle" fill="#9ca3af" fontSize="2.2">{n.name}</text>
                {n.bids > 0 && (
                  <circle cx={n.x + 1.8} cy={n.y - 1.8} r="0.8" fill="#2dd4a0" />
                )}
              </g>
            ))}
          </svg>

          {/* 选中信息 */}
          {selected && (
            <div className="mt-6 pt-6 border-t border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-2 h-2 rounded-full bg-[#c9a84c]" />
                <span className="text-lg font-bold">{selected.name}</span>
                {selected.bids > 0 && <span className="badge">🔥 {selected.bids} 场竞拍</span>}
              </div>
              <div className="grid grid-cols-3 gap-6 text-sm">
                <div><span className="text-[#6b7280]">库存</span><br /><span className="font-bold">{selected.count} 株</span></div>
                <div><span className="text-[#6b7280]">综合评分</span><br /><span className="text-gold font-bold">⭐ {selected.score}</span></div>
                <div><span className="text-[#6b7280]">在线竞拍</span><br /><span className="text-[#2dd4a0] font-bold">{selected.bids} 场</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
