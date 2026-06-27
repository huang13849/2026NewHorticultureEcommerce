'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import { useRegion, type RegionCode } from '@/lib/region-context';
import TabBar from '../TabBar';

interface Product {
  _id: string;
  title?: string;
  flowerName?: string;
  sellPrice?: number;
  price?: number;
  settlementPrice?: number;
  shippingFee?: number;
  shipping_description?: string;
  category?: string;
  panorama_images?: string[];
  detail_images?: string[];
  images?: string[];
  [key: string]: unknown;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  checked: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://100.76.15.64:3010/api';

type CurrencyCode = 'CNY' | 'USD' | 'EUR' | 'JPY' | 'SAR';

const REGION_CURRENCY: Record<RegionCode, CurrencyCode> = {
  cn: 'CNY',
  us: 'USD',
  de: 'EUR',
  jp: 'JPY',
  fr: 'EUR',
  sa: 'SAR',
};

const FALLBACK_RATES: Record<CurrencyCode, number> = {
  CNY: 1,
  USD: 0.138,
  EUR: 0.128,
  JPY: 21.8,
  SAR: 0.518,
};

const CURRENCY_LOCALE: Record<CurrencyCode, string> = {
  CNY: 'zh-CN',
  USD: 'en-US',
  EUR: 'de-DE',
  JPY: 'ja-JP',
  SAR: 'ar-SA',
};

function formatCurrency(cnyAmount: number, currency: CurrencyCode, rate: number): string {
  const amount = cnyAmount * rate;
  return new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(amount);
}

function getImg(p: Product): string {
  const raw = (p.images as string[])?.[0]
    || (p.panorama_images as string[])?.[0]
    || (p.detail_images as string[])?.[0]
    || '';
  if (!raw) return '';
  if (raw.startsWith('http')) return raw;
  return `http://100.96.54.109:9000/supply-chain/${raw}`;
}

function getShippingText(p: Product): string {
  if (typeof p.shipping_description === 'string' && p.shipping_description.trim()) {
    return p.shipping_description.trim();
  }
  if (p.shippingFee === 0) return '免运费';
  if (typeof p.shippingFee === 'number' && p.shippingFee > 0) return `运费 ¥${p.shippingFee}`;
  return '';
}

const shippingBadgeClass = 'mt-1.5 inline-flex max-w-full items-center gap-1 rounded-full border border-orange-100 bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 shadow-[0_1px_5px_rgba(251,146,60,0.14)]';

export default function ShopPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { region } = useRegion();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rates, setRates] = useState<Record<CurrencyCode, number>>(FALLBACK_RATES);
  const [rateSource, setRateSource] = useState<'live' | 'fallback' | 'loading'>('loading');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/products?limit=80`);
        const data = await res.json();
        setProducts(data.products || []);
      } catch { /* empty */ }
      setLoading(false);
    };
    load();

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('flower_cart');
      if (saved) {
        try { setCart(JSON.parse(saved)); } catch { /* empty */ }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && cart.length > 0) {
      localStorage.setItem('flower_cart', JSON.stringify(cart));
    }
  }, [cart]);

  useEffect(() => {
    let alive = true;
    const loadRates = async () => {
      try {
        setRateSource('loading');
        const res = await fetch(`${API}/currency/rates?base=CNY`, { cache: 'no-store' });
        const data = await res.json();
        if (!alive) return;
        setRates({ ...FALLBACK_RATES, ...(data.rates || {}) });
        setRateSource(data.source === 'live' ? 'live' : 'fallback');
      } catch {
        if (!alive) return;
        setRates(FALLBACK_RATES);
        setRateSource('fallback');
      }
    };
    loadRates();
    return () => { alive = false; };
  }, []);

  const addToCart = (product: Product) => {
    const img = getImg(product);
    const price = Number(product.sellPrice || product.price || product.settlementPrice || 0);
    const name = product.title || product.flowerName || t('home.unnamed');

    setCart(prev => {
      const existing = prev.find(item => item.productId === product._id);
      if (existing) {
        return prev.map(item =>
          item.productId === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId: product._id, name, price, image: img, quantity: 1, checked: true }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = cart.filter(i => i.checked).reduce((sum, i) => sum + i.price * i.quantity, 0);
  const currency = REGION_CURRENCY[region.code] || 'CNY';
  const exchangeRate = rates[currency] || FALLBACK_RATES[currency];
  const fxLabel = rateSource === 'live' ? '实时汇率' : rateSource === 'loading' ? '汇率加载中' : '备用汇率';

  const filtered = search
    ? products.filter(p => {
        const name = (p.title || p.flowerName || '').toLowerCase();
        return name.includes(search.toLowerCase());
      })
    : products;

  const goCheckout = () => {
    localStorage.setItem('flower_cart', JSON.stringify(cart.filter(i => i.checked)));
    router.push('/payment?from=cart');
  };

  return (
    <main className="min-h-screen bg-white text-stone-900 pb-20">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-stone-200/60 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-center flex-1">{t('shop.flowerShop')}</h1>
          <div className="text-[10px] text-stone-400 whitespace-nowrap">{region.flag} {currency}</div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-10 pt-5">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('shop.searchPlaceholder')}
          className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 transition-colors"
        />
        <div className="mt-2 flex items-center justify-between text-[10px] text-stone-400">
          <span>当前地区：{region.flag} {t(`regions.${region.code}.name`)} · 币种 {currency}</span>
          <span>{fxLabel} · 1 CNY ≈ {exchangeRate.toFixed(currency === 'JPY' ? 2 : 4)} {currency}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-10 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="text-3xl animate-pulse">⏳</div></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-400">{t('shop.noProducts')}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(p => {
              const img = getImg(p);
              const price = Number(p.sellPrice || p.price || p.settlementPrice || 0);
              const name = p.title || p.flowerName || t('home.unnamed');
              const shippingText = getShippingText(p);
              const inCart = cart.find(i => i.productId === p._id);
              return (
                <div key={p._id} className="rounded-2xl border border-stone-200 bg-white overflow-hidden hover:border-emerald-300 hover:shadow-md transition-all">
                  <div className="aspect-square bg-stone-100 flex items-center justify-center overflow-hidden relative">
                    {img ? (
                      <img src={img} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl opacity-20">🌿</span>
                    )}
                    {inCart && (
                      <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                        {inCart.quantity}
                      </span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <h4 className="text-xs font-medium text-stone-900 truncate">{name}</h4>
                    {shippingText && (
                      <div className={shippingBadgeClass} title={shippingText}>
                        <span className="grid h-4 w-4 flex-shrink-0 place-items-center rounded-full bg-white/80 text-[9px] shadow-sm">🚚</span>
                        <span className="truncate">{shippingText}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-sm font-bold text-emerald-700">{formatCurrency(price, currency, exchangeRate)}</span>
                      <button onClick={() => addToCart(p)} className="bg-emerald-700 text-white text-[10px] px-2.5 py-1 rounded-lg hover:bg-emerald-800 transition-colors">
                        + {t('product.addToCart')}
                      </button>
                    </div>
                    {p.category && <span className="text-[10px] text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded mt-1 inline-block">{p.category}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-14 left-0 right-0 bg-white border-t border-stone-200 z-10">
          <div className="max-w-6xl mx-auto px-6 md:px-10 py-3 flex items-center justify-between">
            <div>
              <span className="text-xs text-stone-500">🛒 {t('shop.cartCount', { count: totalItems })} </span>
              <span className="text-lg font-bold text-emerald-700">{formatCurrency(totalAmount, currency, exchangeRate)}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCart([])} className="text-xs text-stone-400 px-3 py-2">{t('cart.clear')}</button>
              <button onClick={goCheckout} className="bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-800 transition-colors">
                {t('cart.checkout')}
              </button>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-6 md:px-10 flex gap-2 mt-2 overflow-x-auto pb-2">
            {cart.map(item => (
              <div key={item.productId} className="flex items-center gap-1.5 bg-stone-50 rounded-lg px-2 py-1 flex-shrink-0">
                <span className="text-xs">{item.image ? '' : '🌿'}</span>
                <span className="text-[10px] text-stone-700 max-w-[60px] truncate">{item.name}</span>
                <span className="text-[10px] text-stone-400">×{item.quantity}</span>
                <button onClick={() => removeFromCart(item.productId)} className="text-[10px] text-red-400 ml-1">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <TabBar />
    </main>
  );
}
