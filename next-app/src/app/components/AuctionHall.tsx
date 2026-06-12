'use client';

import { Product } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

interface Props {
  products: Product[];
  loading: boolean;
}

// 模拟竞拍记录
const records = [
  { user: 'VIP 用户 A', price: 28600, time: '2分钟前', badge: '北京某地产集团' },
  { user: '认证采购商', price: 25800, time: '8分钟前', badge: '天津园林工程' },
  { user: 'VIP 用户 B', price: 23500, time: '15分钟前', badge: '河北市政项目' },
];

export default function AuctionHall({ products, loading }: Props) {
  return (
    <section className="py-24 px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="label mb-3">AUCTION HALL</div>
          <h2 className="text-3xl font-bold tracking-wide">拍卖大厅</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* 左 — 当前拍品 */}
          <div>
            <div className="text-[11px] text-[#6b7280] tracking-[3px] mb-6">当前拍品</div>
            {loading ? (
              <div className="card p-8 text-center text-[#6b7280]">加载中...</div>
            ) : products.length === 0 ? (
              <div className="card p-8 text-center text-[#6b7280]">暂无拍品</div>
            ) : (
              <div className="space-y-4">
                {products.slice(0, 4).map(p => (
                  <div key={p._id} className="card p-4 flex items-center gap-4">
                    <div className="w-16 h-16 bg-[#1f2937] rounded flex items-center justify-center text-2xl flex-shrink-0">
                      {p.category === '鲜花' ? '🌸' : p.category === '球根' ? '🌺' : p.category === '苗木' ? '🌲' : '🌳'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">{p.title || p.flowerName}</div>
                      <div className="text-xs text-[#6b7280] mt-0.5">{p.origin} · {p.sellerName}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-gold font-bold">{formatPrice(p.sellPrice || p.price)}</div>
                      <div className="text-xs text-[#6b7280]">{p.category}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 右 — 竞拍记录 */}
          <div>
            <div className="text-[11px] text-[#6b7280] tracking-[3px] mb-6">竞拍记录</div>
            <div className="space-y-0">
              {records.map((r, i) => (
                <div key={i} className="border-l-2 border-[#c9a84c] pl-5 py-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-white">{r.user}</div>
                      <div className="text-xs text-[#6b7280] mt-1">{r.badge} · 认证采购商</div>
                    </div>
                    <div className="text-right">
                      <div className="text-gold font-bold">¥{r.price.toLocaleString()}</div>
                      <div className="text-xs text-[#6b7280]">{r.time}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
