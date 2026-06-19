'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TabBar from '../TabBar';
import { useI18n } from '@/lib/i18n/context';

type PayMethod = 'stripe' | 'paypal' | 'alipay';
type PayStatus = 'idle' | 'creating' | 'redirecting' | 'success' | 'failed';

interface PayProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  quantity?: number;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://100.76.15.64:3010/api';

function PaymentContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const fromCart = searchParams.get('from') === 'cart';

  const [products, setProducts] = useState<PayProduct[]>([]);
  const [payMethod, setPayMethod] = useState<PayMethod>('stripe');
  const [payStatus, setPayStatus] = useState<PayStatus>('idle');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const [paymentConfig, setPaymentConfig] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/payment/config-status`)
      .then(r => r.json())
      .then(d => setPaymentConfig(d))
      .catch(() => setPaymentConfig({ stripe: false, paypal: false, alipay: false }));

    if (fromCart && typeof window !== 'undefined') {
      const saved = localStorage.getItem('flower_cart');
      if (saved) {
        try {
          const items = JSON.parse(saved).filter((i: any) => i.checked !== false);
          setProducts(items.map((i: any) => ({
            id: i.productId || i.id,
            name: i.name,
            price: Number(i.price || 0),
            image: i.image || '',
            description: '',
            quantity: i.quantity || 1,
          })));
        } catch { /* empty */ }
      }
    } else {
      fetch(`${API}/payment/products`)
        .then(r => r.json())
        .then(d => setProducts((d.products || []).map((p: any) => ({ ...p, quantity: 1 }))))
        .catch(() => {});
    }
  }, [fromCart]);

  const totalAmount = Math.round(products.reduce((sum, p) => sum + p.price * (p.quantity || 1), 0) * 100) / 100;
  const totalItems = products.reduce((sum, p) => sum + (p.quantity || 1), 0);

  const paymentMethods = [
    { key: 'stripe' as PayMethod, name: 'Stripe', desc: 'Visa / Mastercard / Apple Pay / Google Pay', icon: '💳', enabled: paymentConfig?.stripe?.configured, color: 'border-indigo-500 bg-indigo-50 text-indigo-700' },
    { key: 'paypal' as PayMethod, name: 'PayPal', desc: 'PayPal balance / international cards', icon: '🅿️', enabled: paymentConfig?.paypal?.configured, color: 'border-blue-500 bg-blue-50 text-blue-700' },
    { key: 'alipay' as PayMethod, name: 'Alipay', desc: '待确认：国内收款可能需要企业资质 / 网站备案', icon: '💙', enabled: paymentConfig?.alipay?.configured, color: 'border-sky-500 bg-sky-50 text-sky-700' },
  ];

  const handlePay = async () => {
    if (products.length === 0 || totalAmount <= 0) return;
    if (payMethod === 'alipay' && !paymentConfig?.alipay?.configured) {
      setPayStatus('failed');
      setMessage('支付宝暂未开通：无 ICP 备案场景下国内线上收款可能无法通过审核，建议先用 Stripe / PayPal。');
      return;
    }
    setPayStatus('creating');
    setMessage('');
    try {
      const res = await fetch(`${API}/payment/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payMethod,
          items: products.map(p => ({ productId: p.id, name: p.name, price: p.price, quantity: p.quantity || 1, image: p.image })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '创建支付失败');
      setOrderId(data.orderId);
      if (data.checkoutUrl) {
        setPayStatus('redirecting');
        window.location.href = data.checkoutUrl;
      } else if (data.mock) {
        setPayStatus('success');
        setMessage(data.message || '模拟支付成功：配置 Stripe / PayPal Key 后会跳转真实收银台。');
      } else {
        setPayStatus('failed');
        setMessage('支付通道未返回收银台地址。');
      }
    } catch (err: any) {
      setPayStatus('failed');
      setMessage(err.message || '创建支付失败');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 to-white text-stone-900 pb-24">
      <div className="sticky top-0 z-10 bg-white/85 backdrop-blur-xl border-b border-stone-200/60 px-6 py-4">
        <h1 className="text-lg font-bold text-center">聚合支付</h1>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-10 py-6 space-y-5">
        <section className="rounded-3xl border border-stone-200 bg-white p-5 md:p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-bold">订单摘要</h2>
              <p className="text-xs text-stone-400 mt-1">{totalItems} 件商品 · Stripe / PayPal 优先，支付宝待资质确认</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-stone-400">合计</p>
              <p className="text-2xl font-black text-emerald-700">¥{totalAmount.toFixed(2)}</p>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-sm">{t('shop.noProducts')}</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {products.map(p => (
                <div key={p.id} className="py-3 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-stone-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p.image ? <img src={p.image.startsWith('http') ? p.image : `http://100.96.54.109:9000/supply-chain/${p.image}`} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-xl opacity-30">🌿</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-xs text-stone-400">×{p.quantity || 1}</p>
                  </div>
                  <p className="text-sm font-bold text-stone-900">¥{(p.price * (p.quantity || 1)).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 md:p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4">选择支付方式</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {paymentMethods.map(m => {
              const active = payMethod === m.key;
              return (
                <button key={m.key} onClick={() => setPayMethod(m.key)} className={`text-left rounded-2xl border p-4 transition-all ${active ? m.color : 'border-stone-200 hover:border-stone-300 bg-white'} ${m.key === 'alipay' && !m.enabled ? 'opacity-80' : ''}`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-2xl">{m.icon}</span>
                    {active && <span className="text-xs font-bold">✓</span>}
                  </div>
                  <p className="font-bold text-sm">{m.name}</p>
                  <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">{m.desc}</p>
                  <p className={`text-[10px] mt-3 ${m.enabled ? 'text-emerald-600' : 'text-amber-600'}`}>{m.enabled ? '已配置' : (m.key === 'alipay' ? '待开通' : '未配置，当前走模拟')}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 leading-relaxed">
            支付宝说明：国内支付宝网站/APP 收款通常需要企业主体、网站合规材料，很多场景会要求 ICP 备案；如果没有备案，建议优先使用 Stripe / PayPal 做国际卡和 PayPal 收款，支付宝等资质确认后再开。
          </div>
        </section>

        {payStatus === 'success' && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-bold text-emerald-800">支付流程已创建</p>
            <p className="text-xs text-emerald-700 mt-1">订单号：{orderId}</p>
            {message && <p className="text-xs text-emerald-700 mt-2">{message}</p>}
          </section>
        )}

        {payStatus === 'failed' && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-sm font-medium text-red-800">{message || t('payment.payFailed')}</p>
            <button onClick={() => setPayStatus('idle')} className="mt-2 text-xs text-emerald-700 font-medium">重试</button>
          </section>
        )}
      </div>

      {payStatus !== 'success' && (
        <div className="fixed bottom-14 left-0 right-0 bg-white border-t border-stone-200 z-10">
          <div className="max-w-5xl mx-auto px-6 md:px-10 py-3 flex items-center justify-between">
            <div>
              <span className="text-xs text-stone-500">合计: </span>
              <span className="text-xl font-bold text-emerald-700">¥{totalAmount.toFixed(2)}</span>
            </div>
            <button onClick={handlePay} disabled={products.length === 0 || payStatus === 'creating' || payStatus === 'redirecting'} className={`px-8 py-3 rounded-xl text-sm font-bold transition-colors ${products.length > 0 ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'bg-stone-200 text-stone-400 cursor-not-allowed'}`}>
              {payStatus === 'creating' ? '创建中…' : payStatus === 'redirecting' ? '跳转中…' : `使用 ${paymentMethods.find(x => x.key === payMethod)?.name || '支付'} 支付`}
            </button>
          </div>
        </div>
      )}

      <TabBar />
    </main>
  );
}

export default function PaymentPage() {
  const { t } = useI18n();
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-stone-400">{t('common.loading')}</div>}>
      <PaymentContent />
    </Suspense>
  );
}
