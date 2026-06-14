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
function hasImg(p: any): boolean { return !!getImg(p); }

const SUCCESS_STORIES = [
  { img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80', title: '北京别墅庭院改造', desc: '25棵白皮松 + 80棵月季，30天从裸地到花园', tag: '别墅庭院' },
  { img: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80', title: '天津婚礼花艺布置', desc: '2000支百合 + 500支玫瑰，48小时交付', tag: '婚礼花艺' },
  { img: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=80', title: '廊坊小区绿化工程', desc: '乔灌木混植 300棵，季度养护全包', tag: '社区绿化' },
  { img: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80', title: '顺义温室大棚供货', desc: '每周2000盆盆花稳定配送', tag: '商业供货' },
  { img: 'https://images.unsplash.com/photo-1598902108854-d1446b65d5f0?w=800&q=80', title: '保定陵园景观设计', desc: '常青树 + 时令花卉四季常青', tag: '园林景观' },
  { img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80', title: '丰台阳台花园改造', desc: '2米空间打造微型花园', tag: '阳台花园' },
];

const REVIEWS = [
  { name: '张先生', loc: '北京朝阳', text: '白皮松成活率95%以上，一年后依然长势喜人，比花鸟市场靠谱多了！', stars: 5, avatar: '👷' },
  { name: '李女士', loc: '天津南开', text: '婚礼鲜花全程冷链，百合开得特别饱满，宾客都问在哪订的。', stars: 5, avatar: '👰' },
  { name: '王经理', loc: '廊坊开发区', text: '小区绿化一键下单，送货上门还包种植，物业费省了一大笔。', stars: 5, avatar: '👨‍💼' },
  { name: '赵总', loc: '顺义花卉市场', text: '每周稳定供货2000盆，品质统一，客户回头率明显提升。', stars: 5, avatar: '🧑‍🌾' },
  { name: '刘女士', loc: '保定', text: '陵园四季常青方案很专业，家属反馈很满意，会长期合作。', stars: 5, avatar: '👩‍💼' },
  { name: '陈先生', loc: '丰台', text: '2米阳台变成了小花园，老婆说这是今年最好的礼物！', stars: 5, avatar: '🧑' },
];

// 🌱 绿色认证数据
const GREEN_CERT_STATS = [
  { label: '已认证树木', value: '12,847', unit: '棵', icon: '🌳' },
  { label: '碳汇累计', value: '3,256', unit: '吨 CO₂', icon: '🏭' },
  { label: '碳币流通', value: '162,800', unit: 'CC', icon: '🪙' },
  { label: '参与用户', value: '4,521', unit: '人', icon: '👥' },
];

const GREEN_CERT_FEATURES = [
  {
    icon: '🔍',
    title: '苗木溯源',
    desc: '每棵认证苗木拥有唯一溯源 ID，从种苗到成树全生命周期记录。品种、产地、种植者、养护记录一目了然。',
    details: ['区块链存证', 'GPS 种植定位', '全生命周期档案', 'QR 码一扫即查'],
  },
  {
    icon: '👤',
    title: '人树绑定',
    desc: '认证树木与种植者/养护人实名绑定，责任到人。定期上传与植物合照，确保树木存活与养护质量。',
    details: ['实名认证绑定', '季度拍照打卡', 'AI 存活识别', '养护评分体系'],
  },
  {
    icon: '📏',
    title: '碳计量',
    desc: '基于树种、胸径、树龄等参数，按 IPCC 标准计算碳汇量。每季度更新碳储量数据，透明可审计。',
    details: ['IPCC 碳汇公式', '季度碳储量更新', '树种系数库', '碳汇证书发放'],
  },
  {
    icon: '🪙',
    title: '碳币交易',
    desc: '碳汇量自动转换为碳币（CC），可用于平台购物抵扣、碳积分兑换，也可在碳币市场自由交易。',
    details: ['自动碳币铸造', '购物抵扣支付', '碳币市场交易', '提现与转让'],
  },
];

const GREEN_CERT_STEPS = [
  { step: 1, title: '提交认证', desc: '上传苗木信息 + 实名认证 + GPS 定位', icon: '📝' },
  { step: 2, title: '审核通过', desc: '平台审核苗木信息，发放绿色认证标签', icon: '✅' },
  { step: 3, title: '人树绑定', desc: '种植者与树木绑定，开始碳计量', icon: '🤝' },
  { step: 4, title: '季度打卡', desc: '每季度上传与植物合照 + 生长数据', icon: '📸' },
  { step: 5, title: '碳币发放', desc: '根据碳汇量自动发放碳币到账户', icon: '🪙' },
  { step: 6, title: '交易抵扣', desc: '碳币可用于购物抵扣或市场交易', icon: '💰' },
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
        {/* Nav */}
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

        {/* Quick Entry */}
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

        {/* 🌱 绿色认证 — 碳汇溯源 */}
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
        <section className="px-6 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-stone-900 p-8 md:p-12 text-white">
              <div className="text-center mb-10">
                <p className="text-xs text-emerald-200 font-semibold tracking-widest uppercase mb-2">Green Certification · Carbon Credit</p>
                <h2 className="text-2xl md:text-4xl font-bold mb-3">苗木绿色认证 & 碳币体系</h2>
                <p className="text-emerald-100/80 text-sm max-w-2xl mx-auto">每棵认证苗木都可溯源、可计量、可交易。从种植到碳汇，构建可信的绿色价值链。</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {GREEN_CERT_STATS.map((s, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
                    <span className="text-2xl mb-2 block">{s.icon}</span>
                    <div className="text-xl md:text-2xl font-bold">{s.value}</div>
                    <div className="text-[10px] text-emerald-200">{s.unit} · {s.label}</div>
                  </div>
                ))}
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                {GREEN_CERT_FEATURES.map((f, i) => (
                  <div key={i} className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{f.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-bold text-sm mb-2">{f.title}</h3>
                        <p className="text-emerald-100/70 text-xs leading-relaxed mb-3">{f.desc}</p>
                        <div className="flex flex-wrap gap-2">
                          {f.details.map((d, j) => (
                            <span key={j} className="bg-emerald-600/30 text-emerald-100 text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/20">{d}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Flow Steps */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="font-bold text-sm mb-5 text-center">认证流程</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {GREEN_CERT_STEPS.map((s, i) => (
                    <div key={i} className="text-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-400/20 border border-emerald-300/30 flex items-center justify-center mx-auto mb-2">
                        <span className="text-lg">{s.icon}</span>
                      </div>
                      <div className="text-[10px] text-emerald-300 font-bold mb-0.5">Step {s.step}</div>
                      <div className="text-xs font-semibold mb-0.5">{s.title}</div>
                      <div className="text-[10px] text-emerald-100/60 leading-tight">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="text-center mt-8">
                <a href="/garden" className="inline-block bg-white text-emerald-800 px-8 py-3 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-colors">
                  申请绿色认证 →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 成功案例 */}
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
                    <img src={s.img} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
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

        {/* 用户好评 */}
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
                  <p className="text-xs text-stone-500 leading-relaxed">&ldquo;{r.text}&rdquo;</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Products */}
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
