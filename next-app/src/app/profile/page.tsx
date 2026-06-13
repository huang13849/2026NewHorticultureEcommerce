'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import LoginPrompt from '../components/LoginPrompt';
import TabBar from '../TabBar';

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
  const { user, loading, logout } = useAuth();
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState<Address>({
    name: '', phone: '', province: '', city: '', district: '', detail: '', isDefault: false,
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0e1a] text-white flex items-center justify-center">
        <div className="animate-spin text-3xl">🌸</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0a0e1a] text-white">
        <LoginPrompt message="登录后查看个人中心" />
        <TabBar />
      </main>
    );
  }

  const addresses: Address[] = (user as any).address || [];

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
      // Refresh user data
      window.location.reload();
    } catch (err: any) {
      setMsg(err.message || '保存失败');
    }
    setSaving(false);
  };

  return (
    <>
      <main className="min-h-screen bg-[#0a0e1a] text-white pb-24">
        <nav className="sticky top-0 z-50 bg-[#0a0e1a]/90 backdrop-blur-md border-b border-white/5">
          <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
            <span className="text-gold font-bold tracking-[3px] text-xs">个人中心</span>
            <button onClick={logout} className="text-xs text-[#6b7280] hover:text-red-400 transition-colors">
              退出
            </button>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-6 pt-6 space-y-6">
          {/* 用户卡片 */}
          <div className="card p-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#dbb960] flex items-center justify-center text-2xl">
              {(user as any).avatar || '🌸'}
            </div>
            <div>
              <h2 className="text-lg font-bold">{(user as any).nickname || '花友'}</h2>
              <p className="text-[#9ca3af] text-sm">{(user as any).phone}</p>
            </div>
          </div>

          {/* 收货地址 */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="label">收货地址</h2>
              <button onClick={openAddAddress} className="text-[#c9a84c] text-xs hover:text-[#dbb960]">
                + 新增地址
              </button>
            </div>

            {addresses.length === 0 ? (
              <div className="card p-8 text-center text-[#6b7280] text-sm">
                暂无收货地址，请添加
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr, i) => (
                  <div key={i} className="card p-4 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">{addr.name} <span className="text-[#9ca3af] font-normal">{addr.phone}</span></p>
                      <p className="text-xs text-[#9ca3af] mt-1">
                        {addr.province}{addr.city}{addr.district}{addr.detail}
                      </p>
                      {addr.isDefault && (
                        <span className="inline-block bg-[#2dd4a0]/10 text-[#2dd4a0] text-[10px] px-2 py-0.5 rounded mt-1">默认</span>
                      )}
                    </div>
                    <button onClick={() => openEditAddress(i)} className="text-xs text-[#6b7280] hover:text-[#c9a84c]">
                      编辑
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 地址表单 */}
            {showAddressForm && (
              <div className="card p-4 mt-3 space-y-3">
                <h3 className="text-sm font-semibold">{editingIdx !== null ? '编辑地址' : '新增地址'}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    placeholder="姓名"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="bg-[#111827] border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-[#4b5563]"
                  />
                  <input
                    placeholder="手机号"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="bg-[#111827] border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-[#4b5563]"
                  />
                  <input
                    placeholder="省"
                    value={form.province}
                    onChange={e => setForm({ ...form, province: e.target.value })}
                    className="bg-[#111827] border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-[#4b5563]"
                  />
                  <input
                    placeholder="市"
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    className="bg-[#111827] border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-[#4b5563]"
                  />
                  <input
                    placeholder="区/县"
                    value={form.district}
                    onChange={e => setForm({ ...form, district: e.target.value })}
                    className="bg-[#111827] border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-[#4b5563]"
                  />
                  <label className="flex items-center gap-2 text-sm text-[#9ca3af]">
                    <input
                      type="checkbox"
                      checked={form.isDefault}
                      onChange={e => setForm({ ...form, isDefault: e.target.checked })}
                      className="accent-[#c9a84c]"
                    />
                    设为默认
                  </label>
                </div>
                <input
                  placeholder="详细地址（街道、门牌号等）"
                  value={form.detail}
                  onChange={e => setForm({ ...form, detail: e.target.value })}
                  className="w-full bg-[#111827] border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-[#4b5563]"
                />
                <div className="flex gap-3">
                  <button onClick={saveAddress} disabled={saving} className="btn-primary text-[11px] py-2 px-6">
                    {saving ? '保存中...' : '保存'}
                  </button>
                  <button onClick={() => setShowAddressForm(false)} className="btn-ghost text-[11px] py-2 px-6">
                    取消
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* 种花成就 */}
          <section>
            <h2 className="label mb-3">种花成就</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '已种植', value: (user as any).gardenStats?.totalPlanted || 0, emoji: '🌱' },
                { label: '已成熟', value: (user as any).gardenStats?.totalCompleted || 0, emoji: '🌸' },
                { label: '已获赠', value: (user as any).gardenStats?.totalGifted || 0, emoji: '🎁' },
              ].map(s => (
                <div key={s.label} className="card p-4 text-center">
                  <span className="text-2xl">{s.emoji}</span>
                  <p className="text-xl font-bold text-[#c9a84c] mt-1">{s.value}</p>
                  <p className="text-[10px] text-[#6b7280]">{s.label}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {msg && (
          <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 bg-[#111827] border border-[#c9a84c]/30 rounded-lg px-4 py-2 text-sm text-[#c9a84c]">
            {msg}
            <button onClick={() => setMsg('')} className="ml-2 text-[#6b7280]">✕</button>
          </div>
        )}
      </main>
      <TabBar />
    </>
  );
}
