'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TabBar from '../TabBar';

interface PayProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
}

type PayMethod = 'wechat' | 'alipay';
type PayScene = 'jsapi' | 'h5' | 'native';
type PayStatus = 'idle' | 'creating' | 'paying' | 'success' | 'failed';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://100.76.15.64:3010/api';

function isWechatBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  return /MicroMessenger/i.test(navigator.userAgent);
}

function PaymentContent() {
  const searchParams = useSearchParams();
  const fromCart = searchParams.get('from') === 'cart';
  const fromAuction = searchParams.get('from') === 'auction';

  const [products, setProducts] = useState<PayProduct[]>([]);
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [payMethod, setPayMethod] = useState<PayMethod>('wechat');
  const [payStatus, setPayStatus] = useState<PayStatus>('idle');
  const [orderId, setOrderId] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [payConfig, setPayConfig] = useState<{ configured: boolean; mode: string } | null>(null);
  const [h5PayUrl, setH5PayUrl] = useState('');
  const [nativeCodeUrl, setNativeCodeUrl] = useState('');

  useEffect(() => {
    // 检测支付配置状态
    fetch(`${API}/wechat-pay/config-status`)
      .then(r => r.json())
      .then(d => setPayConfig(d))
      .catch(() => setPayConfig({ configured: false, mode: 'mock' }));

    // 加载商品
    if (fromCart && typeof window !== 'undefined') {
      const saved = localStorage.getItem('flower_cart');
      if (saved) {
        try {
          const items = JSON.parse(saved).filter((i: any) => i.checked !== false);
          const prods: PayProduct[] = items.map((i: any) => ({
            id: i.productId || i.id,
            name: i.name,
            price: i.price,
            image: i.image || '',
            description: '',
          }));
          setProducts(prods);
          const sel = new Map<string, number>();
          prods.forEach(p => sel.set(p.id, 1));
          setSelectedItems(sel);
        } catch { /* empty */ }
      }
    } else {
      fetch(`${API}/wechat-pay/products`)
        .then(r => r.json())
        .then(d => setProducts(d.products || []))
        .catch(() => {});
    }
  }, [fromCart]);

  useEffect(() => {
    let total = 0;
    selectedItems.forEach((qty, id) => {
      const p = products.find(pp => pp.id === id);
      if (p) total += p.price * qty;
    });
    setTotalAmount(Math.round(total * 100) / 100);
  }, [selectedItems, products]);

  // 轮询订单状态
  useEffect(() => {
    if (!orderId || payStatus !== 'paying') return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${API}/wechat-pay/query/${orderId}`);
        const data = await res.json();
        if (data.trade_state === 'SUCCESS' || data.order?.status === 'paid') {
          setPayStatus('success');
          clearInterval(timer);
        }
      } catch { /* empty */ }
    }, 3000);
    return () => clearInterval(timer);
  }, [orderId, payStatus]);

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const toggleItem = (id: string) => {
    const next = new Map(selectedItems);
    if (next.has(id)) next.delete(id);
    else next.set(id, 1);
    setSelectedItems(next);
  };

  const changeQty = (id: string, delta: number) => {
    const next = new Map(selectedItems);
    const cur = next.get(id) || 1;
    const nv = Math.max(1, cur + delta);
    next.set(id, nv);
    setSelectedItems(next);
  };

  const handlePay = async () => {
    if (selectedItems.size === 0) return;
    setPayStatus('creating');

    const items = Array.from(selectedItems.entries()).map(([id, qty]) => {
      const p = products.find(pp => pp.id === id);
      return { productId: id, name: p?.name || '', price: p?.price || 0, quantity: qty, image: p?.image || '' };
    });

    // 判断支付场景
    const payScene: PayScene = isWechatBrowser() ? 'jsapi' : 'h5';

    try {
      const res = await fetch(`${API}/wechat-pay/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, payMethod, payScene }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPayStatus('failed');
        return;
      }

      setOrderId(data.orderId);
      setPayStatus('paying');
      setCountdown(300); // 5分钟超时

      if (data.mock) {
        // 模拟模式 — 直接弹窗确认
        return;
      }

      if (data.payScene === 'jsapi' && data.jsapiParams) {
        // 微信内 JSAPI 调起支付
        if (typeof (window as any).WeixinJSBridge !== 'undefined') {
          (window as any).WeixinJSBridge.invoke('getBrandWCPayRequest', data.jsapiParams, (payResult: any) => {
            if (payResult.err_msg === 'get_brand_wcpay_request:ok') {
              setPayStatus('success');
            } else {
              setPayStatus('failed');
            }
          });
        } else {
          // 等待 WeixinJSBridge ready
          document.addEventListener('WeixinJSBridgeReady', () => {
            (window as any).WeixinJSBridge.invoke('getBrandWCPayRequest', data.jsapiParams, (payResult: any) => {
              if (payResult.err_msg === 'get_brand_wcpay_request:ok') {
                setPayStatus('success');
              } else {
                setPayStatus('failed');
              }
            });
          });
        }
      } else if (data.payScene === 'h5' && data.h5Url) {
        // H5 支付 — 跳转微信
        setH5PayUrl(data.h5Url);
        window.location.href = data.h5Url;
      } else if (data.payScene === 'native' && data.codeUrl) {
        // Native 扫码支付
        setNativeCodeUrl(data.codeUrl);
      }
    } catch (err) {
      console.error('创建订单失败:', err);
      setPayStatus('failed');
    }
  };

  const handleMockPay = async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`${API}/wechat-pay/pay/${orderId}`, { method: 'POST' });
      const data = await res.json();
      if (data.message) setPayStatus('success');
    } catch {
      setPayStatus('failed');
    }
  };

  const selectedCount = selectedItems.size;

  return (
    <main className="min-h-screen bg-white text-stone-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-stone-200/60 px-6 py-4">
        <h1 className="text-lg font-bold text-center">确认支付</h1>
      </div>

      {/* Pay Config Notice */}
      {payConfig && !payConfig.configured && (
        <div className="mx-4 mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="text-xs font-semibold text-amber-800">微信支付模拟模式</p>
            <p className="text-[10px] text-amber-600 mt-0.5">商户号未配置，点击下方"模拟支付"完成测试。配置商户号后将自动切换为真实支付。</p>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* 商品列表 */}
        <section className="rounded-xl border border-stone-200 divide-y divide-stone-100">
          {products.map(p => {
            const selected = selectedItems.has(p.id);
            const qty = selectedItems.get(p.id) || 1;
            return (
              <div key={p.id} className="flex items-center gap-3 p-3">
                <button onClick={() => toggleItem(p.id)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? 'bg-emerald-600 border-emerald-600' : 'border-stone-300'}`}>
                  {selected && <span className="text-white text-[10px]">✓</span>}
                </button>
                <div className="w-14 h-14 rounded-lg bg-stone-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {p.image ? (
                    <img src={p.image.startsWith('http') ? p.image : `http://100.96.54.109:9000/supply-chain/${p.image}`} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl opacity-30">🌿</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-emerald-700 font-bold mt-0.5">¥{p.price.toFixed(2)}</p>
                </div>
                {selected && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => changeQty(p.id, -1)} className="w-6 h-6 rounded-full border border-stone-300 text-stone-500 flex items-center justify-center text-sm">−</button>
                    <span className="text-sm font-medium w-6 text-center">{qty}</span>
                    <button onClick={() => changeQty(p.id, 1)} className="w-6 h-6 rounded-full border border-stone-300 text-stone-500 flex items-center justify-center text-sm">+</button>
                  </div>
                )}
              </div>
            );
          })}
          {products.length === 0 && (
            <div className="p-8 text-center text-stone-400 text-sm">暂无商品</div>
          )}
        </section>

        {/* 支付方式 */}
        <section className="rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-3">支付方式</p>
          <div className="flex gap-3">
            <button
              onClick={() => setPayMethod('wechat')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${payMethod === 'wechat' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-stone-200 text-stone-500'}`}
            >
              <span className="text-lg">💚</span> 微信支付
            </button>
            <button
              onClick={() => setPayMethod('alipay')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${payMethod === 'alipay' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-stone-200 text-stone-500'}`}
            >
              <span className="text-lg">💙</span> 支付宝
            </button>
          </div>
          <p className="text-[10px] text-stone-400 mt-2 text-center">
            {isWechatBrowser() ? '🔍 检测到微信浏览器，将使用 JSAPI 支付' : '🌐 非微信浏览器，将使用 H5 支付'}
          </p>
        </section>

        {/* 金额汇总 */}
        <section className="rounded-xl border border-stone-200 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">商品 ({selectedCount}件)</span>
            <span>¥{totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">运费</span>
            <span className="text-emerald-600">免运费</span>
          </div>
          <div className="border-t border-stone-100 pt-2 flex justify-between">
            <span className="text-sm font-medium">合计</span>
            <span className="text-xl font-bold text-emerald-700">¥{totalAmount.toFixed(2)}</span>
          </div>
        </section>

        {/* 支付状态 */}
        {payStatus === 'paying' && !h5PayUrl && !nativeCodeUrl && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <div className="text-2xl mb-2 animate-pulse">⏳</div>
            <p className="text-sm font-medium text-amber-800">等待支付...</p>
            {countdown > 0 && <p className="text-xs text-amber-600 mt-1">剩余 {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</p>}
            {payConfig && !payConfig.configured && (
              <button onClick={handleMockPay} className="mt-3 bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                模拟支付 ¥{totalAmount.toFixed(2)}
              </button>
            )}
          </section>
        )}

        {payStatus === 'success' && (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-lg font-bold text-emerald-800">支付成功</p>
            <p className="text-xs text-emerald-600 mt-1">订单号: {orderId}</p>
            <a href="/" className="inline-block mt-4 bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
              返回首页
            </a>
          </section>
        )}

        {payStatus === 'failed' && (
          <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
            <div className="text-2xl mb-2">❌</div>
            <p className="text-sm font-medium text-red-800">支付失败</p>
            <button onClick={() => setPayStatus('idle')} className="mt-2 text-xs text-emerald-700 font-medium">
              重试
            </button>
          </section>
        )}

        {/* Native 扫码 */}
        {nativeCodeUrl && payStatus === 'paying' && (
          <section className="rounded-xl border border-stone-200 p-4 text-center">
            <p className="text-sm font-medium mb-3">请用微信扫码支付</p>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(nativeCodeUrl)}`} alt="QR Code" className="mx-auto rounded-lg" />
          </section>
        )}
      </div>

      {/* 底部支付栏 */}
      {payStatus === 'idle' && (
        <div className="fixed bottom-14 left-0 right-0 bg-white border-t border-stone-200 px-6 py-3 flex items-center justify-between z-10">
          <div>
            <span className="text-xs text-stone-500">合计: </span>
            <span className="text-xl font-bold text-emerald-700">¥{totalAmount.toFixed(2)}</span>
          </div>
          <button
            onClick={handlePay}
            disabled={selectedCount === 0}
            className={`px-8 py-3 rounded-xl text-sm font-bold transition-colors ${selectedCount > 0 ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'bg-stone-200 text-stone-400 cursor-not-allowed'}`}
          >
            {payMethod === 'wechat' ? '微信支付' : '支付宝支付'}
          </button>
        </div>
      )}

      <TabBar />
    </main>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-stone-400">加载中...</div>}>
      <PaymentContent />
    </Suspense>
  );
}
