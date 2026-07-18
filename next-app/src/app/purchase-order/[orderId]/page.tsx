
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { resolveMinioUrl } from '@/lib/imageUrl';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';

interface OrderItem {
  sku_id?: string;
  productId?: string;
  title?: string;
  name?: string;
  qty?: number;
  quantity?: number;
  unit_price?: number;
  price?: number;
  subtotal?: number;
  snapshot?: any;
}
interface PgOrder {
  order_no: string;
  status: string;
  subtotal: number | string;
  shipping_fee: number | string;
  discount: number | string;
  total: number | string;
  currency: string;
  shipping_address?: any;
  metadata?: any;
  items?: OrderItem[];
  created_at?: string;
  paid_at?: string | null;
}

function money(v: any) { const n = Number(v || 0); return `¥${n.toFixed(2)}`; }
function fmtDate(s?: string | null) {
  if (!s) return '';
  try { return new Date(s).toLocaleString('zh-CN', { hour12: false }); } catch { return String(s); }
}

export default function PurchaseOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = String((params as any)?.orderId || '');
  const [order, setOrder] = useState<PgOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    fetch(`${API}/payment/order/${encodeURIComponent(orderId)}`, { credentials: 'include', cache: 'no-store' })
      .then(async r => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error || `HTTP ${r.status}`);
        setOrder(d.order || null);
        setLoading(false);
      })
      .catch(e => { setError(e.message || '加载失败'); setLoading(false); });
  }, [orderId]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  const addr = order?.shipping_address || {};
  const meta = order?.metadata || {};
  const items = order?.items || [];
  const totalQty = items.reduce((s, it) => s + Number(it.qty || it.quantity || 0), 0);

  if (loading) return <main className="min-h-screen flex items-center justify-center bg-white"><p className="text-stone-400">加载中…</p></main>;
  if (error) return <main className="min-h-screen flex items-center justify-center bg-white"><div className="text-center"><p className="text-red-600 font-bold">加载失败</p><p className="text-sm text-stone-500 mt-2">{error}</p><button className="mt-4 px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm" onClick={() => router.push('/shop')}>返回商城</button></div></main>;
  if (!order) return null;

  return (
    <main className="min-h-screen bg-stone-50 py-6 md:py-10 print:bg-white print:py-0">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-page { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto px-4">
        {/* 操作栏 */}
        <div className="flex items-center justify-between mb-4 no-print">
          <button onClick={() => router.push('/shop')} className="text-sm text-stone-500 hover:text-stone-800">← 返回商城</button>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800">🖨️ 打印/保存 PDF</button>
          </div>
        </div>

        {/* 采购单主体 */}
        <div className="print-page bg-white rounded-2xl shadow-sm border border-stone-200 p-6 md:p-10">
          <div className="border-b border-stone-200 pb-4 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight">采购单</h1>
                <p className="text-xs text-stone-500 mt-1">Plant Collector · 花伴商城</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-stone-400">采购单号</p>
                <p className="font-mono text-sm font-bold">{order.order_no}</p>
                <p className="text-[11px] text-stone-400 mt-2">下单时间</p>
                <p className="text-xs">{fmtDate(order.created_at)}</p>
              </div>
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-bold text-emerald-800">
                {order.status === 'pending_offline' ? '待联系发货（线下收款）' : order.status}
              </span>
            </div>
          </div>

          {/* 收货信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-xs font-bold text-stone-400 mb-2 tracking-wider uppercase">收货人</h2>
              <p className="text-sm font-bold">{addr.memberName || '—'}</p>
              <p className="text-sm text-stone-600 mt-1">{addr.phone || ''}</p>
              <p className="text-sm text-stone-600 mt-1 leading-relaxed">{addr.text || ''}</p>
            </div>
            <div>
              <h2 className="text-xs font-bold text-stone-400 mb-2 tracking-wider uppercase">结算方式</h2>
              <p className="text-sm">
                {meta.pay_method === 'offline' ? '线下收款（我们将电话联系您）' : (meta.provider || meta.pay_method || '在线支付')}
              </p>
              <p className="text-[11px] text-stone-400 mt-2">归属：{meta.region === 'cn' ? '国内订单' : '国际订单'}</p>
            </div>
          </div>

          {/* 商品明细 */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b-2 border-stone-800">
                <th className="text-left py-2 font-bold">商品</th>
                <th className="text-right py-2 font-bold w-20">单价</th>
                <th className="text-right py-2 font-bold w-16">数量</th>
                <th className="text-right py-2 font-bold w-24">小计</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const name = it.title || it.name || (it.snapshot && (it.snapshot.name || it.snapshot.title)) || '商品';
                const price = Number(it.unit_price ?? it.price ?? 0);
                const qty = Number(it.qty ?? it.quantity ?? 1);
                const sub = it.subtotal != null ? Number(it.subtotal) : price * qty;
                const image = it.snapshot?.image || '';
                return (
                  <tr key={idx} className="border-b border-stone-100">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        {image ? <img src={resolveMinioUrl(image)} alt={name} className="w-10 h-10 rounded object-cover no-print" /> : null}
                        <span>{name}</span>
                      </div>
                    </td>
                    <td className="text-right py-3">{money(price)}</td>
                    <td className="text-right py-3">×{qty}</td>
                    <td className="text-right py-3 font-medium">{money(sub)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="pt-4 text-xs text-stone-500">共 {items.length} 种商品，合计 {totalQty} 件</td>
                <td className="pt-4 text-right text-xs text-stone-500">商品小计</td>
                <td className="pt-4 text-right">{money(order.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="text-right text-xs text-stone-500 pt-1">运费</td>
                <td className="text-right pt-1">{money(order.shipping_fee)}</td>
              </tr>
              {Number(order.discount) > 0 && (
                <tr>
                  <td colSpan={3} className="text-right text-xs text-stone-500 pt-1">优惠</td>
                  <td className="text-right pt-1 text-red-600">-{money(order.discount)}</td>
                </tr>
              )}
              <tr className="border-t border-stone-300">
                <td colSpan={3} className="text-right pt-3 font-bold">应付总额</td>
                <td className="text-right pt-3 text-2xl font-black text-emerald-700">{money(order.total)}</td>
              </tr>
            </tfoot>
          </table>

          {/* 备注 */}
          <div className="border-t border-stone-200 pt-4 text-xs text-stone-500 leading-relaxed">
            <p>本采购单由花伴商城生成，仅作发货 & 收款凭证。我们的工作人员将尽快与您电话联系，确认订单详情、约定发货时间与线下收款方式。</p>
            <p className="mt-2">如有疑问，请联系客服电话：<span className="font-mono text-stone-700">18511987921</span></p>
          </div>
        </div>
      </div>
    </main>
  );
}
