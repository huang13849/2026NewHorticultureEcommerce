'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import TabBar from '../TabBar';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  checked: boolean;
}

const DEFAULT_PRODUCTS = [
  { id: 'test-flower-001', name: '测试花卉A', price: 0.01, image: '🌸', description: '0.01元测试商品 — 春日樱花苗' },
  { id: 'test-flower-002', name: '测试花卉B', price: 0.01, image: '🌺', description: '0.01元测试商品 — 夏日木槿苗' },
];

export default function ShopPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从 localStorage 恢复购物车
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('flower_cart');
      if (saved) {
        try { setCart(JSON.parse(saved)); } catch {}
      }
    }
    setLoading(false);
  }, []);

  // 保存购物车到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && cart.length > 0) {
      localStorage.setItem('flower_cart', JSON.stringify(cart));
    }
  }, [cart]);

  const addToCart = (product: typeof DEFAULT_PRODUCTS[0]) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
        checked: true,
      }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
    // 同步清理 localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('flower_cart');
      if (saved) {
        try {
          const items = JSON.parse(saved).filter((i: CartItem) => i.productId !== productId);
          localStorage.setItem('flower_cart', JSON.stringify(items));
        } catch {}
      }
    }
  };

  const toggleCheck = (productId: string) => {
    setCart(prev => prev.map(item =>
      item.productId === productId ? { ...item, checked: !item.checked } : item
    ));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      const newQty = Math.max(1, item.quantity + delta);
      return { ...item, quantity: newQty };
    }));
  };

  const checkedItems = cart.filter(item => item.checked);
  const totalAmount = checkedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = checkedItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <main className="min-h-screen bg-[#0a0e1a] text-white pb-24">
        {/* 顶部导航 */}
        <nav className="sticky top-0 z-50 bg-[#0a0e1a]/90 backdrop-blur-md border-b border-white/5">
          <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌸</span>
              <span className="text-gold font-bold tracking-[3px] text-xs">花伴商店</span>
            </div>
            <Link href="/cart" className="relative text-sm text-[#9ca3af] hover:text-white transition-colors">
              🛒 购物车
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-4 bg-[#c9a84c] text-[#0a0e1a] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </Link>
          </div>
        </nav>

        {/* 商品列表 */}
        <section className="max-w-2xl mx-auto px-4 pt-6">
          <h2 className="label mb-4">测试商品</h2>
          <div className="grid grid-cols-2 gap-3">
            {DEFAULT_PRODUCTS.map(product => (
              <div key={product.id} className="card p-4 flex flex-col items-center gap-3">
                <span className="text-4xl">{product.image}</span>
                <div className="text-center">
                  <p className="text-sm font-semibold">{product.name}</p>
                  <p className="text-[11px] text-[#6b7280] mt-1">{product.description}</p>
                  <p className="text-[#c9a84c] font-bold mt-2">¥{product.price.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => addToCart(product)}
                  className="btn-primary text-[11px] py-2 px-6 w-full"
                >
                  加入购物车
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 购物车预览 */}
        {cart.length > 0 && (
          <section className="max-w-2xl mx-auto px-4 pt-8">
            <h2 className="label mb-4">购物车 ({cart.length})</h2>
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.productId} className="card p-4 flex items-center gap-3">
                  <button
                    onClick={() => toggleCheck(item.productId)}
                    className={`w-5 h-5 rounded border flex items-center justify-center text-xs transition-colors ${
                      item.checked
                        ? 'bg-[#c9a84c] border-[#c9a84c] text-[#0a0e1a]'
                        : 'border-[#374151]'
                    }`}
                  >
                    {item.checked && '✓'}
                  </button>
                  <span className="text-2xl">{item.image}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-[#c9a84c] text-sm">¥{item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.productId, -1)}
                      className="w-6 h-6 rounded border border-[#374151] text-[#9ca3af] flex items-center justify-center text-sm hover:border-[#c9a84c] hover:text-[#c9a84c] transition-colors"
                    >
                      −
                    </button>
                    <span className="text-sm w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, 1)}
                      className="w-6 h-6 rounded border border-[#374151] text-[#9ca3af] flex items-center justify-center text-sm hover:border-[#c9a84c] hover:text-[#c9a84c] transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-[#6b7280] hover:text-red-400 text-sm transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* 结算栏 */}
            <div className="card p-4 mt-4 flex items-center justify-between">
              <div>
                <span className="text-[#9ca3af] text-sm">已选 {totalItems} 件</span>
                <span className="text-[#c9a84c] font-bold text-lg ml-3">¥{totalAmount.toFixed(2)}</span>
              </div>
              <Link
                href="/cart"
                className={`btn-primary text-[11px] py-2 px-8 ${checkedItems.length === 0 ? 'opacity-40 pointer-events-none' : ''}`}
              >
                去结算
              </Link>
            </div>
          </section>
        )}
      </main>
      <TabBar />
    </>
  );
}
