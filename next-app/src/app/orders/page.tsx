'use client';

import { useState, useEffect } from 'react';
import { resolveMinioUrl } from '@/lib/imageUrl';
import TabBar from '../TabBar';

type Region = 'cn' | 'global';

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface Order {
  _id: string;
  orderId: string;
  items: OrderItem[];
  totalAmount: number;
  subtotal?: number;
  shippingFee?: number;
  couponCode?: string;
  couponDiscount?: number;
  payMethod: string;
  provider?: string;
  status: string;
  region?: string;
  memberName?: string;
  phone?: string;
  deliveryAddress?: string;
  createdAt: string;
  paidAt?: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "/api";
const REGION = process.env.NEXT_PUBLIC_REGION || '';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待支付', color: 'bg-amber-100 text-amber-700' },
  mock_paid: { label: '已支付', color: 'bg-emerald-100 text-emerald-700' },
  paid: { label: '已支付', color: 'bg-emerald-100 text-emerald-700' },
  shipped: { label: '已发货', color: 'bg-blue-100 text-blue-700' },
  completed: { label: '已完成', color: 'bg-stone-100 text-stone-600' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-600' },
};

const PAY_CHANNEL_LABELS: Record<string, { label: string; icon: string }> = {
  stripe: { label: 'Stripe', icon: '💳' },
  paypal: { label: 'PayPal', icon: '🅿️' },
  alipay: { label: '支付宝', icon: '💙' },
  wechat: { label: '微信支付', icon: '💚' },
};

function getPayChannel(payMethod: string, provider?: string): string {
  const key = (payMethod || provider || '').toLowerCase();
  return PAY_CHANNEL_LABELS[key]?.label || provider || payMethod || '未知';
}

function getPayIcon(payMethod: string, provider?: string): string {
  const key = (payMethod || provider || '').toLowerCase();
  return PAY_CHANNEL_LABELS[key]?.icon || '💰';
}

export default function OrdersPage() {
  const [region, setRegion] = useState<Region>(REGION === 'cn' ? 'cn' : 'global');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrders = (r: Region) => {
    setLoading(true);
    setError('');
    fetch(`${API}/payment/orders?region=${r}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(d => {
        setOrders(d.orders || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders(region);
  }, [region]);

  const totalAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalItems = orders.reduce((sum, o) => sum + (o.items || []).reduce((s, i) => s + (i.quantity || 1), 0), 0);

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 to-white text-stone-900 pb-24">
      <div className="sticky top-0 z-10 bg-white/85 backdrop-blur-xl border-b border-stone-200/60 px-6 py-4">
        <h1 className="text-lg font-bold text-center">购买订单管理</h1>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-10 py-6 space-y-5">
        {/* Region Toggle — 国内/国际 */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-2xl border border-stone-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setRegion('cn')}
              className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                region === 'cn'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              🇨🇳 国内订单
            </button>
            <button
              onClick={() => setRegion('global')}
              className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                region === 'global'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              🌍 国际订单
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
            <p className="text-2xl font-black text-emerald-700">{orders.length}</p>
            <p className="text-xs text-stone-400 mt-1">订单数</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
            <p className="text-2xl font-black text-emerald-700">{totalItems}</p>
            <p className="text-xs text-stone-400 mt-1">商品件数</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
            <p className="text-2xl font-black text-emerald-700">¥{totalAmount.toFixed(2)}</p>
            <p className="text-xs text-stone-400 mt-1">总金额</p>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="p-12 text-center text-stone-400">加载中...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-stone-400">
            <p className="text-4xl mb-3">📭</p>
            <p>暂无{region === 'cn' ? '国内' : '国际'}订单</p>
            <p className="text-xs mt-2">支付成功后订单将自动出现在这里</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.pending;
              return (
                <div key={order._id || order.orderId} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                  {/* Header: orderId + status + time */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-stone-400 font-mono">{order.orderId}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-stone-100 mb-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="py-2 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <img src={resolveMinioUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm opacity-30">🌿</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-stone-400">×{item.quantity || 1}</p>
                        </div>
                        <p className="text-sm font-bold">¥{(item.price * (item.quantity || 1)).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Footer: 支付渠道 + 优惠 + 金额 */}
                  <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                    <div className="flex items-center gap-2">
                      {/* 支付渠道 */}
                      <span className="inline-flex items-center gap-1 text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-lg">
                        <span>{getPayIcon(order.payMethod, order.provider)}</span>
                        <span className="font-medium">{getPayChannel(order.payMethod, order.provider)}</span>
                      </span>
                      {order.couponCode && (
                        <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                          {order.couponCode}
                        </span>
                      )}
                    </div>
                    <p className="text-base font-black text-emerald-700">¥{(order.totalAmount || 0).toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TabBar />
    </main>
  );
}
