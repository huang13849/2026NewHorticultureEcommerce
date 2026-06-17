'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TabBar from '../TabBar';
import { useI18n } from '@/lib/i18n/context';
import LangSwitch from '@/app/components/LangSwitch';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  checked: boolean;
}

export default function CartPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('flower_cart');
      if (saved) {
        try { setCart(JSON.parse(saved)); } catch {}
      }
    }
    setLoading(false);
  }, []);

  const toggleCheck = (productId: string) => {
    setCart(prev => prev.map(item =>
      item.productId === productId ? { ...item, checked: !item.checked } : item
    ));
  };

  const toggleAll = () => {
    const allChecked = cart.every(item => item.checked);
    setCart(prev => prev.map(item => ({ ...item, checked: !allChecked })));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      return { ...item, quantity: Math.max(1, item.quantity + delta) };
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  // 持久化
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('flower_cart', JSON.stringify(cart));
    }
  }, [cart]);

  const checkedItems = cart.filter(item => item.checked);
  const totalAmount = checkedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = checkedItems.reduce((sum, item) => sum + item.quantity, 0);

  const goToPayment = () => {
    if (checkedItems.length === 0) return;
    // 保存选中项到 session 用于支付页
    localStorage.setItem('flower_cart', JSON.stringify(checkedItems));
    router.push('/payment');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0e1a] text-white flex items-center justify-center">
        <p className="text-[#6b7280]">加载中…</p>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[#0a0e1a] text-white pb-32">
        {/* 导航 */}
        <nav className="sticky top-0 z-50 bg-[#0a0e1a]/90 backdrop-blur-md border-b border-white/5">
          <div className="max-w-2xl mx-auto px-4 h-12 flex items-center gap-3">
            <Link href="/shop" className="text-[#9ca3af] hover:text-white text-sm">← 商店</Link>
            <span className="text-gold font-bold tracking-[2px] text-xs">{t('cart.title')}</span>
            <span className="text-[#6b7280] text-sm ml-auto">{cart.length} 件商品</span>
          </div>
        </nav>

        {cart.length === 0 ? (
          <div className="max-w-2xl mx-auto px-4 pt-20 text-center">
            <p className="text-5xl mb-4">🛒</p>
            <p className="text-[#6b7280] mb-6">购物车空空如也</p>
            <Link href="/shop" className="btn-primary text-[11px] py-2 px-8">{t('cart.goShop')}</Link>
          </div>
        ) : (
          <>
            {/* 全选 */}
            <div className="max-w-2xl mx-auto px-4 pt-4">
              <label className="flex items-center gap-2 text-sm text-[#9ca3af] cursor-pointer">
                <button
                  onClick={toggleAll}
                  className={`w-5 h-5 rounded border flex items-center justify-center text-xs transition-colors ${
                    cart.every(item => item.checked)
                      ? 'bg-[#c9a84c] border-[#c9a84c] text-[#0a0e1a]'
                      : 'border-[#374151]'
                  }`}
                >
                  {cart.every(item => item.checked) && '✓'}
                </button>
                全选
              </label>
            </div>

            {/* 商品列表 */}
            <div className="max-w-2xl mx-auto px-4 pt-3 space-y-3">
              {cart.map(item => (
                <div key={item.productId} className="card p-4 flex items-center gap-3">
                  <button
                    onClick={() => toggleCheck(item.productId)}
                    className={`w-5 h-5 rounded border flex items-center justify-center text-xs transition-colors flex-shrink-0 ${
                      item.checked
                        ? 'bg-[#c9a84c] border-[#c9a84c] text-[#0a0e1a]'
                        : 'border-[#374151]'
                    }`}
                  >
                    {item.checked && '✓'}
                  </button>
                  <span className="text-3xl">{item.image}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-[#c9a84c] text-sm font-bold">¥{item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.productId, -1)}
                      className="w-7 h-7 rounded border border-[#374151] text-[#9ca3af] flex items-center justify-center text-sm hover:border-[#c9a84c] hover:text-[#c9a84c] transition-colors"
                    >−</button>
                    <span className="text-sm w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, 1)}
                      className="w-7 h-7 rounded border border-[#374151] text-[#9ca3af] flex items-center justify-center text-sm hover:border-[#c9a84c] hover:text-[#c9a84c] transition-colors"
                    >+</button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-[#6b7280] hover:text-red-400 transition-colors ml-1"
                  >✕</button>
                </div>
              ))}
            </div>

            {/* 底部结算栏 */}
            <div className="fixed bottom-16 left-0 right-0 bg-[#111827]/95 backdrop-blur-md border-t border-white/5">
              <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-[#9ca3af] text-sm">合计 ({totalItems}件)</span>
                  <span className="text-[#c9a84c] font-bold text-xl ml-2">¥{totalAmount.toFixed(2)}</span>
                </div>
                <button
                  onClick={goToPayment}
                  disabled={checkedItems.length === 0}
                  className={`btn-primary text-[11px] py-2.5 px-10 ${checkedItems.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  去支付
                </button>
              </div>
            </div>
          </>
        )}
      </main>
      <TabBar />
    </>
  );
}
