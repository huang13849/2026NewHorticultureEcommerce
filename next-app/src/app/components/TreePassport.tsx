'use client';

const items = [
  { icon: '📍', label: 'GIS 坐标', desc: '精确地理定位，产地可追溯' },
  { icon: '📊', label: '生长档案', desc: '树龄、胸径、冠幅完整记录' },
  { icon: '📸', label: '图片档案', desc: '多角度高清实拍' },
  { icon: '🎬', label: '视频档案', desc: '无人机航拍、全景视频' },
  { icon: '💰', label: '价格历史', desc: '市场行情与成交记录' },
  { icon: '🔗', label: '区块链存证', desc: '不可篡改的数字证书' },
];

const certs = [
  '国家林草局认证', 'ISO 9001', '植物检疫证明',
  '产地溯源证明', '种植档案备案', '碳汇交易资格',
];

export default function TreePassport() {
  return (
    <section className="py-24 px-8">
      <div className="max-w-6xl mx-auto">
        {/* 护照 */}
        <div className="text-center mb-16">
          <div className="label mb-3">TREE DIGITAL PASSPORT</div>
          <h2 className="text-3xl font-bold tracking-wide">树木数字护照</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-20">
          {items.map((item, i) => (
            <div key={i} className="card p-6 text-center">
              <div className="text-2xl mb-3">{item.icon}</div>
              <div className="font-medium text-white mb-1">{item.label}</div>
              <div className="text-xs text-[#6b7280]">{item.desc}</div>
            </div>
          ))}
        </div>

        {/* 认证 */}
        <div className="text-center mb-10">
          <div className="label mb-3">CERTIFICATIONS</div>
          <h2 className="text-2xl font-bold tracking-wide">科研认证体系</h2>
        </div>

        <div className="card p-8 text-center">
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            {certs.map((c, i) => (
              <span key={i} className="badge">✅ {c}</span>
            ))}
          </div>
          <div className="hr mb-6" />
          <div className="text-[11px] text-[#6b7280] tracking-[3px] mb-3">BLOCKCHAIN VERIFIED</div>
          <div className="inline-flex items-center gap-2 text-sm text-[#2dd4a0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2dd4a0]" />
            链上存证 · 不可篡改 · 全程可追溯
          </div>
        </div>

        {/* 底部 CTA */}
        <div className="mt-20 text-center">
          <h3 className="text-2xl font-bold text-gold mb-4">开始探索珍稀苗木资产</h3>
          <p className="text-[#6b7280] text-sm mb-8">每一棵树，都值得被认真对待</p>
          <div className="flex justify-center gap-4">
            <button className="btn-primary">进入拍卖大厅</button>
            <button className="btn-ghost">预约咨询</button>
          </div>
        </div>
      </div>
    </section>
  );
}
