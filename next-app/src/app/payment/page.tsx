'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import TabBar from '../TabBar';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

interface Address {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

type PayMethod = 'wechat' | 'alipay';
type PayStatus = 'idle' | 'creating' | 'paying' | 'success' | 'failed';

function PaymentContent() {
  const searchParams = useSearchParams();
  const auctionProductId = searchParams.get('auction');
  const { user } = useAuth();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [payMethod, setPayMethod] = useState<PayMethod>('wechat');
  const [payStatus, setPayStatus] = useState<PayStatus>('idle');
  const [orderId, setOrderId] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [isAuction, setIsAuction] = useState(false);

  // Address
  const addresses: Address[] = (user as any)?.address || [];
  const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
  const [selectedAddrIdx, setSelectedAddrIdx] = useState<number>(defaultAddr ? addresses.indexOf(defaultAddr) : -1);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://100.76.15.64:3010/api';

  useEffect(() => {
    if (auctionProductId) {
      // Auction checkout
      setIsAuction(true);
      fetchAuctionInfo(auctionProductId);
    } else if (typeof window !== 'undefined') {
      // Cart checkout
      const saved = localStorage.getItem('flower_cart');
      if (saved) {
        try {
          const items: CartItem[] = JSON.parse(saved).filter((i: any) => i.checked !== false);
          setCartItems(items);
          setTotalAmount(items.reduce((sum: number, i: CartItem) => sum + i.price * i.quantity, 0));
        } catch {}
      }
    }
  }, [auctionProductId]);

  // Set default address selection
  useEffect(() => {
    if (addresses.length > 0 && selectedAddrIdx === -1) {
      const defIdx = addresses.findIndex(a => a.isDefault);
      setSelectedAddrIdx(defIdx >= 0 ? defIdx : 0);
    }
  }, [addresses, selectedAddrIdx]);

  const fetchAuctionInfo = async (productId: string) => {
    try {
      const res = await fetch(`${API}/auction/status/${productId}`);
      const data = await res.json();
      if (data.currentPrice) {
        setCartItems([{
          productId,
          name: data.productId || productId,
          price: data.currentPrice,
          image: '',
          quantity: 1,
        }]);
        setTotalAmount(data.currentPrice);
      }
    } catch {}
  };

  useEffect(() => {
    if (payStatus === 'paying' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (payStatus === 'paying' && countdown === 0) {
      simulatePaySuccess();
    }
  }, [payStatus, countdown]);

  const handlePay = async () => {
    if (cartItems.length === 0) return;
    setPayStatus('creating');

    try {
      let res;
      if (isAuction && auctionProductId) {
        // Auction checkout
        const addr = selectedAddrIdx >= 0 ? addresses[selectedAddrIdx] : null;
        res = await fetch(`${API}/auction/checkout/${auctionProductId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payMethod,
            bidderName: addr?.name || '',
            bidderPhone: addr?.phone || '',
            address: addr || {},
          }),
        });
      } else {
        // Cart checkout
        res = await fetch(`${API}/payment/order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cartItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
            payMethod,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '创建订单失败');

      setOrderId(data.orderId);
      setPayStatus('paying');
      setCountdown(3);
    } catch (err: any) {
      setPayStatus('failed');
      alert(err.message || '支付失败');
    }
  };

  const simulatePaySuccess = async () => {
    try {
      const res = await fetch(`${API}/payment/pay/${orderId}`, { method: 'POST' });
      if (res.ok) {
        setPayStatus('success');
        if (typeof window !== 'undefined' && !isAuction) {
          localStorage.removeItem('flower_cart');
        }
      } else {
        setPayStatus('failed');
      }
    } catch {
      setPayStatus('failed');
    }
  };

  if (payStatus === 'success') {
    return (
      <main className="min-h-screen bg-[#0a0e1a] text-white flex items-center justify-center">
        <div className="text-center px-8 max-w-md">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gold mb-2">支付成功</h1>
          <p className="text-[#9ca3af] text-sm mb-1">订单号: {orderId}</p>
          <p className="text-[#9ca3af] text-sm mb-6">支付金额: ¥{totalAmount.toFixed(2)}</p>
          <div className="space-y-3">
            <Link href="/" className="btn-primary block text-center text-[11px] py-3">返回首页</Link>
          </div>
        </div>
      </main>
    );
  }

  const totalItems = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white pb-24">
      <nav className="sticky top-0 z-50 bg-[#0a0e1a]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-12 flex items-center justify-between">
          <Link href={isAuction ? '/auction' : '/cart'} className="text-sm text-[#9ca3af] hover:text-white">← 返回</Link>
          <span className="text-gold font-bold tracking-[3px] text-xs">确认支付</span>
          <div className="w-12" />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-6 space-y-6">
        {/* 订单摘要 */}
        <section>
          <h2 className="label mb-3">订单摘要</h2>
          <div className="card p-4 space-y-3">
            {cartItems.map(item => (
              <div key={item.productId} className="flex items-center gap-3">
                <span className="text-2xl">🌳</span>
                <div className="flex-1">
                  <p className="text-sm">{item.name}</p>
                  <p className="text-[#6b7280] text-xs">x{item.quantity}</p>
                </div>
                <p className="text-[#c9a84c] text-sm">¥{(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
            <div className="border-t border-white/5 pt-3 flex justify-between items-center">
              <span className="text-[#9ca3af] text-sm">共 {totalItems} 件{isAuction ? ' (拍卖)' : ''}</span>
              <span className="text-[#c9a84c] font-bold text-lg">¥{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </section>

        {/* 收货地址 */}
        <section>
          <h2 className="label mb-3">收货地址</h2>
          {addresses.length === 0 ? (
            <div className="card p-4 text-center">
              <p className="text-[#6b7280] text-sm mb-3">暂无收货地址</p>
              <Link href="/profile" className="text-[#c9a84c] text-xs">去添加 →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {addresses.map((addr, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedAddrIdx(i)}
                  className={`w-full card p-3 text-left transition-all ${
                    selectedAddrIdx === i ? 'border-[#c9a84c] bg-[#c9a84c]/5' : ''
                  }`}
                >
                  <p className="text-sm">{addr.name} {addr.phone}</p>
                  <p className="text-xs text-[#9ca3af] mt-1">{addr.province}{addr.city}{addr.district}{addr.detail}</p>
                  {addr.isDefault && <span className="text-[10px] text-[#2dd4a0]">默认</span>}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 支付方式 */}
        <section>
          <h2 className="label mb-3">支付方式</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPayMethod('wechat')}
              className={`card p-3 flex items-center gap-3 transition-all ${payMethod === 'wechat' ? 'border-[#c9a84c] bg-[#c9a84c]/5' : ''}`}
            >
              <span className="text-xl">💚</span>
              <span className="text-sm">微信支付</span>
            </button>
            <button
              onClick={() => setPayMethod('alipay')}
              className={`card p-3 flex items-center gap-3 transition-all ${payMethod === 'alipay' ? 'border-[#c9a84c] bg-[#c9a84c]/5' : ''}`}
            >
              <span className="text-xl">💙</span>
              <span className="text-sm">支付宝</span>
            </button>
          </div>
        </section>

        {/* 支付状态 */}
        {payStatus === 'paying' && (
          <section className="card p-6 text-center">
            <div className="text-4xl mb-3 animate-pulse">{payMethod === 'wechat' ? '💚' : '💙'}</div>
            <p className="text-sm text-[#9ca3af]">正在通过{payMethod === 'wechat' ? '微信' : '支付宝'}支付...</p>
            <p className="text-[#c9a84c] text-2xl font-bold mt-2">{countdown}s</p>
          </section>
        )}

        {/* 支付按钮 */}
        <button
          onClick={handlePay}
          disabled={payStatus !== 'idle' || cartItems.length === 0}
          className={`w-full py-4 rounded text-sm font-bold tracking-[3px] transition-all ${
            payStatus === 'idle' && cartItems.length > 0
              ? 'bg-gradient-to-r from-[#c9a84c] to-[#dbb960] text-[#0a0e1a] hover:shadow-[0_0_30px_rgba(201,168,76,0.3)]'
              : 'bg-[#1f2937] text-[#6b7280] cursor-not-allowed'
          }`}
        >
          {payStatus === 'idle' ? `确认支付 ¥${totalAmount.toFixed(2)}` : payStatus === 'creating' ? '创建订单中...' : '支付中...'}
        </button>
      </div>
    </main>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#0a0e1a] text-white flex items-center justify-center">
        <div className="text-center"><div className="text-4xl animate-pulse mb-4">⏳</div><p className="text-[#9ca3af] text-sm">加载中...</p></div>
      </main>
    }>
      <PaymentContent />
      <TabBar />
    </Suspense>
  );
}
