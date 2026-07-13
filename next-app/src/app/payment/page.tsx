'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRegion } from '@/lib/region-context';
import { resolveMinioUrl } from '@/lib/imageUrl';
import { useSearchParams, useRouter } from 'next/navigation';
import TabBar from '../TabBar';
import { useI18n } from '@/lib/i18n/context';
import { useAuth } from '@/lib/auth-context';
import { api, type Address } from '@/lib/api';

type PayMethod = 'stripe' | 'paypal' | 'alipay' | 'wechat';
type PayStatus = 'idle' | 'creating' | 'redirecting' | 'success' | 'failed';
type WechatPayScene = 'native' | 'h5' | 'jsapi';

const EMPTY_ADDRESS: Address = {
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  isDefault: true,
};

function isAddressComplete(addr?: Partial<Address> | null) {
  if (!addr) return false;
  return ['name', 'phone', 'province', 'city', 'district', 'detail'].every(key =>
    String((addr as any)[key] || '').trim().length > 0
  );
}

function formatAddress(addr?: Partial<Address> | null) {
  if (!addr) return '';
  return [addr.province, addr.city, addr.district, addr.detail].filter(Boolean).join('');
}

interface PayProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  quantity?: number;
}

const API = process.env.NEXT_PUBLIC_API_URL || "/api";
const REGION = process.env.NEXT_PUBLIC_REGION || ''; // 'cn' | 'global' | '' (dev=all)
const IS_CN = REGION === 'cn';
const IS_GLOBAL = REGION === 'global';

type CurrencyCode = 'CNY' | 'USD' | 'EUR' | 'JPY' | 'SAR';
const REGION_CURRENCY: Record<string, CurrencyCode> = {
  cn: 'CNY', us: 'USD', eu: 'EUR', jp: 'JPY', sa: 'SAR',
};
const FALLBACK_RATES: Record<CurrencyCode, number> = { CNY: 1, USD: 0.138, EUR: 0.127, JPY: 21.5, SAR: 0.52 };
const CURRENCY_LOCALE: Record<CurrencyCode, string> = { CNY: 'zh-CN', USD: 'en-US', EUR: 'de-DE', JPY: 'ja-JP', SAR: 'ar-SA' };
function formatCurrency(cnyAmount: number, currency: CurrencyCode, rate: number): string {
  const converted = cnyAmount * rate;
  return new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
    style: 'currency', currency,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(converted);
}


function PaymentContent() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Login guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/payment');
    }
  }, [authLoading, user, router]);

  const fromCart = searchParams.get('from') === 'cart';

  const [products, setProducts] = useState<PayProduct[]>([]);
  const [payMethod, setPayMethod] = useState<PayMethod>('stripe');
  const [payStatus, setPayStatus] = useState<PayStatus>('idle');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [addressList, setAddressList] = useState<Address[]>([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(-1);
  const [addressForm, setAddressForm] = useState<Address>(EMPTY_ADDRESS);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressMessage, setAddressMessage] = useState('');

  // [payment] currency hook
  const { region } = useRegion();
  const currency: CurrencyCode = REGION_CURRENCY[region?.code || (IS_CN ? 'cn' : 'us')] || (IS_CN ? 'CNY' : 'USD');
  const [rates, setRates] = useState<Record<CurrencyCode, number>>(FALLBACK_RATES);
  useEffect(() => {
    fetch(`${API}/currency/rates?base=CNY`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.rates) setRates({ ...FALLBACK_RATES, ...d.rates }); })
      .catch(() => {});
  }, []);
  const exchangeRate = rates[currency] || FALLBACK_RATES[currency];
  const fmt = (amt: number) => formatCurrency(amt, currency, exchangeRate);

  // [payment] Stripe success 回跳:自动 confirm 并跳 /orders
  useEffect(() => {
    const status = searchParams.get('status');
    const sessionId = searchParams.get('session_id');
    const orderId = searchParams.get('orderId');
    if (status === 'success' && orderId) {
      fetch(`${API}/payment/confirm-stripe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId, orderId }),
      }).catch(() => {}).finally(() => {
        try { localStorage.removeItem('flower_cart'); } catch {}
        setTimeout(() => { window.location.href = '/orders'; }, 800);
      });
    }
  }, [searchParams]);

  // Live refetch from /api/user/address so newly-saved rows show without needing profile refresh
  useEffect(() => {
    const zid = (user as any)?.id || (user as any)?.zid;
    if (!zid) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API}/user/address`, { credentials: 'include', cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled) return;
        const list = ((j.address as Address[]) || []).filter(isAddressComplete) as Address[];
        setAddressList(prev => list.length ? list : prev);
        if (list.length) {
          const defaultIndex = list.findIndex(a => a.isDefault);
          const idx = defaultIndex >= 0 ? defaultIndex : 0;
          setSelectedAddressIndex(idx);
          setAddressForm({ ...list[idx], isDefault: true });
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [(user as any)?.id, (user as any)?.zid]);

  useEffect(() => {
    const list = (user?.address || []).filter(isAddressComplete) as Address[];
    setAddressList(list);
    if (list.length > 0) {
      const defaultIndex = list.findIndex(a => a.isDefault);
      const idx = defaultIndex >= 0 ? defaultIndex : 0;
      setSelectedAddressIndex(idx);
      setAddressForm({ ...list[idx], isDefault: true });
    } else {
      setSelectedAddressIndex(-1);
      setAddressForm({
        ...EMPTY_ADDRESS,
        name: user?.nickname || '',
        phone: user?.phone || '',
      });
    }
  }, [user?.id, user?.address, user?.nickname, user?.phone]);

  const selectedAddress = selectedAddressIndex >= 0 ? addressList[selectedAddressIndex] : addressForm;
  const hasPayableAddress = isAddressComplete(selectedAddress);
  const deliveryAddressText = formatAddress(selectedAddress);

  const updateAddressField = (field: keyof Address, value: string | boolean) => {
    setAddressForm(prev => ({ ...prev, [field]: value }));
    setSelectedAddressIndex(-1);
    setAddressMessage('');
  };

    const handleSaveAddress = async (): Promise<boolean> => {
    if (!isAddressComplete(addressForm)) {
      setAddressMessage(t('payment.addressRequired'));
      return false;
    }
    try {
      setSavingAddress(true);
      const result = await api.updateAddress({ ...addressForm, isDefault: true });
      const list = (result.address || []).filter(isAddressComplete) as Address[];
      setAddressList(list);
      const foundIndex = list.findIndex(a => a.detail === addressForm.detail && a.phone === addressForm.phone);
      setSelectedAddressIndex(foundIndex >= 0 ? foundIndex : 0);
      setAddressMessage(t('payment.addressSaved'));
      return true;
    } catch (err: any) {
      setAddressMessage(err.message || t('payment.createOrderFailed'));
      return false;
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addr: Address) => {
    try {
      const id = (addr as any).id;
      if (!id) return;
      const res = await fetch(`${API}/user/address/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(typeof window !== 'undefined' && localStorage.getItem('flower_token')
            ? { Authorization: `Bearer ${localStorage.getItem('flower_token')}` }
            : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'delete_failed');
      const list = (data.address || []).filter(isAddressComplete) as Address[];
      setAddressList(list);
      const defaultIdx = list.findIndex(a => a.isDefault);
      setSelectedAddressIndex(list.length ? (defaultIdx >= 0 ? defaultIdx : 0) : -1);
      if (list.length && (defaultIdx >= 0 || list[0])) {
        setAddressForm({ ...(list[defaultIdx >= 0 ? defaultIdx : 0]), isDefault: true });
      } else {
        setAddressForm({ ...EMPTY_ADDRESS, name: user?.nickname || '', phone: user?.phone || '' });
      }
      setAddressMessage(t('payment.addressDeleted'));
    } catch (err: any) {
      setAddressMessage(err.message || t('payment.createOrderFailed'));
    }
  };

  const handleSetDefault = async (addr: Address) => {
    try {
      const id = (addr as any).id;
      if (!id) return;
      const res = await fetch(`${API}/user/address/${id}/default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(typeof window !== 'undefined' && localStorage.getItem('flower_token')
            ? { Authorization: `Bearer ${localStorage.getItem('flower_token')}` }
            : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'default_failed');
      const list = (data.address || []).filter(isAddressComplete) as Address[];
      setAddressList(list);
      const idx = list.findIndex(a => (a as any).id === id);
      setSelectedAddressIndex(idx >= 0 ? idx : 0);
      if (idx >= 0) setAddressForm({ ...list[idx], isDefault: true });
      setAddressMessage(t('payment.defaultSet'));
    } catch (err: any) {
      setAddressMessage(err.message || t('payment.createOrderFailed'));
    }
  };

  // 微信支付
  const [wechatScene, setWechatScene] = useState<WechatPayScene>('native');
  const [wechatCodeUrl, setWechatCodeUrl] = useState('');
  const [wechatH5Url, setWechatH5Url] = useState('');

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

  // 更新商品数量/移除商品; fromCart 时同步回 localStorage 保持一致
  const persistCart = (list: PayProduct[]) => {
    try {
      if (fromCart && typeof window !== 'undefined') {
        const raw = localStorage.getItem('flower_cart');
        const saved = raw ? JSON.parse(raw) : [];
        const byId = new Map((list || []).map(p => [p.id, p]));
        const next = saved
          .filter((i: any) => byId.has(i.productId))
          .map((i: any) => {
            const p = byId.get(i.productId)!;
            return { ...i, quantity: p.quantity || 1, checked: true };
          });
        localStorage.setItem('flower_cart', JSON.stringify(next));
      }
    } catch {}
  };
  const setQty = (id: string, next: number) => {
    setProducts(prev => {
      const list = prev.map(p => p.id === id ? { ...p, quantity: Math.max(1, next) } : p);
      persistCart(list);
      return list;
    });
  };
  const removeItem = (id: string) => {
    setProducts(prev => {
      const list = prev.filter(p => p.id !== id);
      persistCart(list);
      return list;
    });
  };

  // 按部署区域筛选支付方式
  const allPaymentMethods = [
    { key: 'stripe' as PayMethod, name: 'Stripe', desc: 'Visa / Mastercard / Apple Pay / Google Pay', icon: '💳', enabled: paymentConfig?.stripe?.configured, color: 'border-indigo-500 bg-indigo-50 text-indigo-700', regions: ['global'] },
    { key: 'paypal' as PayMethod, name: 'PayPal', desc: 'PayPal balance / international cards', icon: '🅿️', enabled: paymentConfig?.paypal?.configured, color: 'border-blue-500 bg-blue-50 text-blue-700', regions: ['global'] },
    { key: 'alipay' as PayMethod, name: '支付宝', desc: '支付宝扫码 / 手机网页支付', icon: '💙', enabled: paymentConfig?.alipay?.configured, color: 'border-sky-500 bg-sky-50 text-sky-700', regions: ['cn'] },
    { key: 'wechat' as PayMethod, name: '微信支付', desc: '微信扫码 / 公众号 / 小程序支付', icon: '💚', enabled: true, color: 'border-green-500 bg-green-50 text-green-700', regions: ['cn'] },
  ];

  // 按区域过滤：cn=支付宝+微信, global=Stripe+PayPal, 空(dev)=全部
  const paymentMethods = allPaymentMethods.filter(m => {
    if (!REGION) return true; // dev: show all
    return m.regions.includes(REGION);
  });

  // 自动选第一个可用的支付方式
  useEffect(() => {
    if (paymentMethods.length > 0) {
      const current = paymentMethods.find(m => m.key === payMethod);
      if (!current) {
        setPayMethod(paymentMethods[0].key);
      }
    }
  }, [REGION, paymentConfig]);

  const regionLabel = IS_CN ? t('payment.cnVersion') : IS_GLOBAL ? t('payment.globalVersion') : '';

  const handlePay = async () => {
    if (products.length === 0 || totalAmount <= 0) return;
    if (!hasPayableAddress) {
      setPayStatus('failed');
      setMessage(t('payment.fillAddressFirst'));
      setAddressMessage(t('payment.addressIncomplete'));
      return;
    }
    if (selectedAddressIndex < 0) {
      const ok = await handleSaveAddress();
      if (!ok) return;
    }
    setPayStatus('creating');
    setMessage('');

    // 微信支付走独立路由
    if (payMethod === 'wechat') {
      try {
        const res = await fetch(`${API}/wechat-pay/order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payMethod: 'wechat',
            payScene: wechatScene,
            customer: { name: selectedAddress.name || user?.nickname || '', phone: selectedAddress.phone || user?.phone || '' },
            deliveryAddress: deliveryAddressText,
            items: products.map(p => ({ productId: p.id, name: p.name, price: p.price, quantity: p.quantity || 1, image: p.image })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t('payment.createOrderFailed'));
        setOrderId(data.orderId);
        if (data.codeUrl) {
          setWechatCodeUrl(data.codeUrl);
          setPayStatus('success');
          setMessage(t('payment.wechatScanPay'));
        } else if (data.h5Url) {
          setWechatH5Url(data.h5Url);
          setPayStatus('redirecting');
          window.location.href = data.h5Url;
        } else if (data.jsapiParams) {
          setPayStatus('success');
          setMessage(t('payment.wechatInApp'));
        } else {
          // 模拟模式
          setPayStatus('success');
          setMessage(data.message || t('payment.mockPayDesc'));
        }
      } catch (err: any) {
        setPayStatus('failed');
        setMessage(err.message || t('payment.createOrderFailed'));
      }
      return;
    }

    // Stripe / PayPal / Alipay 走聚合支付路由
    try {
      const res = await fetch(`${API}/payment/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payMethod,
          customer: { name: selectedAddress.name || user?.nickname || '', phone: selectedAddress.phone || user?.phone || '' },
          deliveryAddress: deliveryAddressText,
          items: products.map(p => ({ productId: p.id, name: p.name, price: p.price, quantity: p.quantity || 1, image: p.image })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('payment.createOrderFailed'));
      setOrderId(data.orderId);
      if (data.checkoutUrl) {
        setPayStatus('redirecting');
        window.location.href = data.checkoutUrl;
      } else if (data.mock) {
        setPayStatus('success');
        setMessage(data.message || t('payment.mockPayDesc'));
      } else {
        setPayStatus('failed');
        setMessage(t('payment.payFailed'));
      }
    } catch (err: any) {
      setPayStatus('failed');
      setMessage(err.message || t('payment.createOrderFailed'));
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-400">{t('common.loading')}</p>
      </main>
    );
  }
  if (!user) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-400">{t('payment.pleaseLogin')}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 to-white text-stone-900 pb-24">
      <div className="sticky top-0 z-10 bg-white/85 backdrop-blur-xl border-b border-stone-200/60 px-6 py-4">
        <h1 className="text-lg font-bold text-center">
          {t('payment.aggregatePayment')}
          {regionLabel && <span className="ml-2 text-xs font-normal text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{regionLabel}</span>}
        </h1>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-10 py-6 space-y-5">
        <section className="rounded-3xl border border-stone-200 bg-white p-5 md:p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-bold">{t('payment.orderSummary')}</h2>
              <p className="text-xs text-stone-400 mt-1">
                {IS_CN
                  ? t('payment.goodsCountTipCN', { count: totalItems })
                  : IS_GLOBAL
                    ? t('payment.goodsCountTip', { count: totalItems })
                    : t('payment.goodsCountTipDev', { count: totalItems })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-stone-400">{t('payment.total')}</p>
              <p className="text-2xl font-black text-emerald-700">{fmt(totalAmount)}</p>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-sm">{t('shop.noProducts')}</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {products.map(p => (
                <div key={p.id} className="py-3 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-stone-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p.image ? <img src={resolveMinioUrl(p.image)} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-xl opacity-30">🌿</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-xs text-stone-400">{fmt(p.price)} · 小计 {fmt(p.price * (p.quantity || 1))}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setQty(p.id, (p.quantity || 1) - 1)} className="w-7 h-7 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 disabled:opacity-30" disabled={(p.quantity || 1) <= 1} aria-label="decrease">−</button>
                    <input
                      type="number" min={1}
                      value={p.quantity || 1}
                      onChange={e => setQty(p.id, parseInt(e.target.value || '1', 10) || 1)}
                      className="w-10 text-center text-sm font-bold rounded-lg border border-stone-200 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                    <button type="button" onClick={() => setQty(p.id, (p.quantity || 1) + 1)} className="w-7 h-7 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50" aria-label="increase">+</button>
                    <button type="button" onClick={() => removeItem(p.id)} className="ml-1 text-rose-400 hover:text-rose-600 w-7 h-7 rounded-lg hover:bg-rose-50 text-sm" aria-label="remove">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 md:p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold">{t('payment.shippingAddress')}</h2>
              <p className="text-xs text-stone-400 mt-1">{t('payment.addressTip')}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${hasPayableAddress ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {hasPayableAddress ? t('payment.filled') : t('payment.notFilled')}
            </span>
          </div>

          {addressList.length > 0 && (
            <div className="space-y-2 mb-4">
              {addressList.map((addr, idx) => (
                <div
                  key={(addr as any).id || `${addr.phone}-${addr.detail}-${idx}`}
                  className={`rounded-2xl border p-3 transition-colors ${selectedAddressIndex === idx ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 bg-white hover:border-stone-300'}`}
                >
                  <button
                    type="button"
                    onClick={() => { setSelectedAddressIndex(idx); setAddressForm({ ...addr, isDefault: true }); setAddressMessage(''); }}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold">
                        {addr.name}
                        <span className="ml-2 text-stone-500 font-normal">{addr.phone}</span>
                        {addr.isDefault && <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">{t('payment.defaultLabel')}</span>}
                      </p>
                      {selectedAddressIndex === idx && <span className="text-xs font-bold text-emerald-700">✓ {t('payment.use')}</span>}
                    </div>
                    <p className="text-xs text-stone-500 mt-1">{formatAddress(addr)}</p>
                  </button>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    {!addr.isDefault && (
                      <button type="button" onClick={() => handleSetDefault(addr)} className="text-emerald-700 hover:underline">
                        {t('payment.setDefault')}
                      </button>
                    )}
                    <button type="button" onClick={() => handleDeleteAddress(addr)} className="text-rose-500 hover:underline ml-auto">
                      {t('payment.deleteAddress')}
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => { setSelectedAddressIndex(-1); setAddressForm({ ...EMPTY_ADDRESS, name: user?.nickname || '', phone: user?.phone || '' }); setAddressMessage(''); }}
                className="text-xs font-bold text-emerald-700"
              >
                {t('payment.addOrChangeAddress')}
              </button>
            </div>
          )}

          {selectedAddressIndex < 0 && (
            <div className="grid md:grid-cols-2 gap-3">
              <input value={addressForm.name} onChange={e => updateAddressField('name', e.target.value)} placeholder={t('payment.recipient')} className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <input value={addressForm.phone} onChange={e => updateAddressField('phone', e.target.value)} placeholder={t('payment.phone')} className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <input value={addressForm.province} onChange={e => updateAddressField('province', e.target.value)} placeholder={t('payment.province')} className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <input value={addressForm.city} onChange={e => updateAddressField('city', e.target.value)} placeholder={t('payment.city')} className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <input value={addressForm.district} onChange={e => updateAddressField('district', e.target.value)} placeholder={t('payment.district')} className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <input value={addressForm.detail} onChange={e => updateAddressField('detail', e.target.value)} placeholder={t('payment.detailAddress')} className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <button
                type="button"
                onClick={handleSaveAddress}
                disabled={savingAddress}
                className="md:col-span-2 rounded-xl bg-stone-900 text-white py-2.5 text-sm font-bold disabled:bg-stone-300"
              >
                {savingAddress ? t('payment.saving') : t('payment.saveAndUse')}
              </button>
            </div>
          )}

          {addressMessage && <p className={`mt-3 text-xs ${hasPayableAddress ? 'text-emerald-700' : 'text-red-600'}`}>{addressMessage}</p>}
          {!hasPayableAddress && <p className="mt-3 text-xs text-red-600">{t('payment.addressIncompleteHint')}</p>}
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 md:p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4">{t('payment.selectPaymentMethod')}</h2>
          <div className={`grid gap-3 ${paymentMethods.length <= 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
            {paymentMethods.map(m => {
              const active = payMethod === m.key;
              const isWechat = m.key === 'wechat';
              return (
                <div key={m.key}>
                <button
                  onClick={() => setPayMethod(m.key)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all ${active ? m.color : 'border-stone-200 hover:border-stone-300 bg-white'} ${!m.enabled && m.key !== 'wechat' ? 'opacity-80' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-2xl">{m.icon}</span>
                    {active && <span className="text-xs font-bold">✓</span>}
                  </div>
                  <p className="font-bold text-sm">{m.name}</p>
                  <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">{m.desc}</p>
                  {m.key !== 'wechat' && (
                    <p className={`text-[10px] mt-3 ${m.enabled ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {m.enabled ? t('payment.configured') : t('payment.notConfigured')}
                    </p>
                  )}
                  {isWechat && (
                    <p className="text-[10px] mt-3 text-emerald-600">{t('payment.wechatTagline')}</p>
                  )}
                </button>
                {/* 微信支付场景选择 */}
                {isWechat && active && (
                  <div className="mt-2 flex gap-2">
                    {(['native', 'h5'] as WechatPayScene[]).map(scene => (
                      <button key={scene} onClick={() => setWechatScene(scene)} className={`flex-1 text-xs py-1.5 px-2 rounded-lg border transition-colors ${wechatScene === scene ? 'border-green-400 bg-green-50 text-green-700 font-medium' : 'border-stone-200 text-stone-500'}`}>
                        {scene === 'native' ? t('payment.wechatScan') : t('payment.wechatH5')}
                      </button>
                    ))}
                  </div>
                )}
                </div>
              );
            })}
          </div>
        </section>

        {payStatus === 'success' && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-bold text-emerald-800">{t('payment.orderCreated')}</p>
            <p className="text-xs text-emerald-700 mt-1">{t('payment.orderNumber')}：{orderId}</p>
            <p className="text-sm font-bold text-emerald-800 mt-2">{t('payment.amountDue')}：{fmt(totalAmount)}</p>
            {message && <p className="text-xs text-emerald-700 mt-2">{message}</p>}
            {wechatCodeUrl && <img src={wechatCodeUrl} alt={t('payment.wechatPay')} className="mx-auto mt-3 w-48 h-48 rounded-xl border" />}
            <button
              onClick={() => window.open('/order/', '_blank')}
              className="mt-4 px-6 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800 transition-colors"
            >
              {t('payment.viewOrder')}
            </button>
          </section>
        )}

        {payStatus === 'failed' && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-sm font-medium text-red-800">{message || t('payment.payFailed')}</p>
            <button onClick={() => setPayStatus('idle')} className="mt-2 text-xs text-emerald-700 font-medium">{t('common.retry')}</button>
          </section>
        )}
      </div>

      {payStatus !== 'success' && (
        <div className="fixed bottom-14 left-0 right-0 bg-white border-t border-stone-200 z-10">
          <div className="max-w-5xl mx-auto px-6 md:px-10 py-3 flex items-center justify-between">
            <div>
              <span className="text-xs text-stone-500">{t('payment.total')}: </span>
              <span className="text-xl font-bold text-emerald-700">{fmt(totalAmount)}</span>
            </div>
            <button onClick={handlePay} disabled={products.length === 0 || !hasPayableAddress || payStatus === 'creating' || payStatus === 'redirecting'} className={`px-6 md:px-8 py-3 rounded-xl text-sm font-bold transition-colors ${products.length > 0 && hasPayableAddress ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'bg-stone-200 text-stone-400 cursor-not-allowed'}`}>
              {!hasPayableAddress ? t('payment.fillAddressToPay') : payStatus === 'creating' ? t('payment.creating') : payStatus === 'redirecting' ? t('payment.redirecting') : t('payment.payWith', { method: paymentMethods.find(x => x.key === payMethod)?.name || t('payment.payNow') })}
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
