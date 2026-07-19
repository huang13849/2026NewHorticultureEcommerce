'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import TabBar from '../TabBar';
import LoginPrompt from '../components/LoginPrompt';
import { useI18n } from '@/lib/i18n/context';
import LangSwitch from '@/app/components/LangSwitch';
import { formatPrice } from '@/lib/utils';
import { useRegion } from '@/lib/region-context';

interface Address {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

export default function ProfilePage() {
  const { region } = useRegion();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { t } = useI18n();
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [orderStats, setOrderStats] = useState<{count:number; items:number; total:number}>({count:0, items:0, total:0});
  const [isDomestic, setIsDomestic] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const h = window.location.hostname || '';
      setIsDomestic(h.endsWith('.club') || h === 'localhost' || /^100\./.test(h) || /^192\.168\./.test(h) || /^10\./.test(h));
    }
  }, []);
  useEffect(() => {
    if (!user) return;
    fetch('/api/user/orders?region=cn', { credentials: 'include', cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.orders) return;
        const paid = (d.orders as any[]).filter(o => ['paid','mock_paid','pending_offline'].includes(o.status));
        const items = paid.reduce((s, o) => s + (o.items||[]).reduce((ss:number,i:any)=>ss+(i.quantity||1),0), 0);
        const total = paid.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
        setOrderStats({ count: paid.length, items, total: Math.round(total*100)/100 });
      })
      .catch(() => {});
  }, [(user as any)?.id, (user as any)?.zid]);

  const [form, setForm] = useState<Address>({
    name: '', phone: '', province: '', city: '', district: '', detail: '', isDefault: false,
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-stone-900 flex items-center justify-center">
        <div className="animate-spin text-3xl">🌸</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-white text-stone-900">
        <LoginPrompt message="登录后查看个人中心" />
        <TabBar />
      </main>
    );
  }

  const addresses: Address[] = (user as any).address || [];
  const isAdmin = (user as any).isAdmin || (user as any).isSuperAdmin;
  const isSuperAdmin = (user as any).isSuperAdmin;

  const openAddAddress = () => {
    setEditingIdx(null);
    setForm({ name: '', phone: '', province: '', city: '', district: '', detail: '', isDefault: false });
    setShowAddressForm(true);
  };

  const openEditAddress = (idx: number) => {
    setEditingIdx(idx);
    setForm({ ...addresses[idx] });
    setShowAddressForm(true);
  };

  const saveAddress = async () => {
    if (!form.name || !form.phone || !form.detail) {
      setMsg('请填写姓名、手机号和详细地址');
      return;
    }
    setSaving(true);
    try {
      await api.updateAddress(form);
      setMsg('地址已保存');
      setShowAddressForm(false);
      window.location.reload();
    } catch (err: any) {
      setMsg(err.message || t('common.saveFailed'));
    }
    setSaving(false);
  };

  return (
    <>
      <main className="min-h-screen bg-white text-stone-900 pb-24">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-stone-200/60 px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm">{t('profile.title')}</span>
            <button onClick={logout} className="text-xs text-stone-400 hover:text-red-500 transition-colors">
              退出登录
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
          {/* 用户卡片 */}
          <div className="rounded-2xl border border-stone-200 p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-2xl shadow-md">
              {(user as any).avatar || '🌸'}
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-stone-900">{(user as any).nickname || t('profile.flowerFriend')}</h2>
              <p className="text-xs text-stone-400">{(user as any).phone}</p>
            </div>
            {isSuperAdmin && (
              <button onClick={() => router.push('/admin')} className="bg-emerald-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-full hover:bg-emerald-800 transition-colors">
                👑 管理后台
              </button>
            )}
          </div>

          {/* 管理员入口 */}
          {isAdmin && !isSuperAdmin && (
            <button onClick={() => router.push('/admin')} className="w-full text-left block rounded-2xl border border-emerald-200 bg-emerald-50 p-4 hover:bg-emerald-100 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚙️</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">{t('admin.title')}</p>
                  <p className="text-[10px] text-emerald-600">支付配置、系统管理</p>
                </div>
                <span className="ml-auto text-emerald-400">→</span>
              </div>
            </button>
          )}

          {/* 我的订单 — 国内单一列表统计 */}
          {isDomestic && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-stone-900">我的订单</h2>
                <a href="/orders" className="text-xs text-emerald-700 font-medium">查看全部 →</a>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 text-center">
                  <p className="text-2xl font-black text-emerald-700">{orderStats.count}</p>
                  <p className="text-[10px] text-stone-500 mt-1">订单数</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 text-center">
                  <p className="text-2xl font-black text-emerald-700">{orderStats.items}</p>
                  <p className="text-[10px] text-stone-500 mt-1">商品件数</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 text-center">
                  <p className="text-xl font-black text-emerald-700">{formatPrice(orderStats.total, region.code)}</p>
                  <p className="text-[10px] text-stone-500 mt-1">结账总金额</p>
                </div>
              </div>
            </section>
          )}

          {/* 功能菜单 */}
          <div className="rounded-2xl border border-stone-200 divide-y divide-stone-100">
            {[
              { icon: '📦', label: t('profile.myOrders'), href: '/orders' },
              { icon: '🌱', label: t('garden.title'), href: '/garden' },
              { icon: '📍', label: '收货地址', action: 'address' },
              { icon: '💬', label: '联系客服', href: 'tel:18511987921' },
            ].map(item => (
              item.action === 'address' ? (
                <button key={item.label} onClick={openAddAddress} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-stone-50 transition-colors text-left">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm text-stone-700 flex-1">{item.label}</span>
                  <span className="text-stone-300 text-sm">→</span>
                </button>
              ) : (
                <a key={item.label} href={item.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-stone-50 transition-colors">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm text-stone-700 flex-1">{item.label}</span>
                  <span className="text-stone-300 text-sm">→</span>
                </a>
              )
            ))}
          </div>

          {/* 收货地址列表 */}
          {addresses.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-stone-900">{t('payment.shippingAddress')}</h2>
                <button onClick={openAddAddress} className="text-xs text-emerald-700 font-medium">+ 新增</button>
              </div>
              <div className="space-y-2">
                {addresses.map((addr, i) => (
                  <div key={i} className="rounded-xl border border-stone-200 p-3 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{addr.name} <span className="text-stone-400 font-normal">{addr.phone}</span></p>
                      <p className="text-xs text-stone-400 mt-0.5">{addr.province}{addr.city}{addr.district}{addr.detail}</p>
                      {addr.isDefault && (
                        <span className="inline-block bg-emerald-50 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded mt-1 font-medium">{t('shop.default')}</span>
                      )}
                    </div>
                    <button onClick={() => openEditAddress(i)} className="text-xs text-stone-400 hover:text-emerald-700">{t('common.edit')}</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 地址表单 */}
          {showAddressForm && (
            <div className="rounded-xl border border-stone-200 p-4 space-y-3">
              <h3 className="text-sm font-bold">{editingIdx !== null ? '编辑地址' : '新增地址'}</h3>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="姓名" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
                <input placeholder={t('login.phonePlaceholder')} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
                <input placeholder="省" value={form.province} onChange={e => setForm({ ...form, province: e.target.value })} className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
                <input placeholder="市" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
                <input placeholder="区/县" value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
                <label className="flex items-center gap-2 text-sm text-stone-500">
                  <input type="checkbox" checked={form.isDefault} onChange={e => setForm({ ...form, isDefault: e.target.checked })} className="accent-emerald-600" />
                  设为默认
                </label>
              </div>
              <input placeholder="详细地址" value={form.detail} onChange={e => setForm({ ...form, detail: e.target.value })} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
              <div className="flex gap-2">
                <button onClick={saveAddress} disabled={saving} className="bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800 transition-colors disabled:opacity-50">
                  {saving ? t('common.saving') : t('common.save')}
                </button>
                <button onClick={() => setShowAddressForm(false)} className="bg-stone-100 text-stone-500 px-5 py-2 rounded-lg text-sm hover:bg-stone-200 transition-colors">
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 种花成就 */}
          <section>
            <h2 className="text-sm font-bold text-stone-900 mb-3">{t('garden.achievements')}</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t('garden.planted'), value: (user as any).gardenStats?.totalPlanted || 0, emoji: '🌱' },
                { label: t('garden.mature'), value: (user as any).gardenStats?.totalCompleted || 0, emoji: '🌸' },
                { label: '已获赠', value: (user as any).gardenStats?.totalGifted || 0, emoji: '🎁' },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-stone-200 p-3 text-center">
                  <span className="text-xl">{s.emoji}</span>
                  <p className="text-lg font-bold text-emerald-700 mt-1">{s.value}</p>
                  <p className="text-[10px] text-stone-400">{s.label}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {msg && (
          <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white rounded-lg px-4 py-2 text-sm">
            {msg}
            <button onClick={() => setMsg('')} className="ml-2 text-stone-400">✕</button>
          </div>
        )}
      </main>
      <TabBar />
    </>
  );
}
