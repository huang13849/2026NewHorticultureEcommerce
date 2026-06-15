'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import TabBar from '../TabBar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://100.76.15.64:3010/api';

type Tab = 'wechat' | 'alipay' | 'overview';

interface WechatConfig {
  appId: string;
  mchId: string;
  apiV3KeySet: boolean;
  apiV3Key: string;
  serialNo: string;
  privateKeySet: boolean;
  privateKey: string;
  notifyUrl: string;
  enabled: boolean;
}

interface AlipayConfig {
  appId: string;
  merchantPrivateKeySet: boolean;
  merchantPrivateKey: string;
  alipayPublicKeySet: boolean;
  alipayPublicKey: string;
  notifyUrl: string;
  gateway: string;
  enabled: boolean;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [wechat, setWechat] = useState<WechatConfig>({
    appId: 'wx1670cc892b5373b8', mchId: '', apiV3KeySet: false, apiV3Key: '',
    serialNo: '', privateKeySet: false, privateKey: '', notifyUrl: 'https://209.141.34.146/api/wechat-pay/notify', enabled: false,
  });
  const [alipay, setAlipay] = useState<AlipayConfig>({
    appId: '', merchantPrivateKeySet: false, merchantPrivateKey: '',
    alipayPublicKeySet: false, alipayPublicKey: '',
    notifyUrl: 'https://209.141.34.146/api/alipay/notify', gateway: 'https://openapi.alipay.com/gateway.do', enabled: false,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    // 等待 AuthProvider 从 localStorage 恢复用户信息后再判断权限
    if (loading) return;
    if (!(user as any)?.isSuperAdmin) {
      router.push('/login');
      return;
    }
    loadConfig();
  }, [user, loading]);

  const loadConfig = async () => {
    try {
      const token = localStorage.getItem('flower_token');
      const res = await fetch(`${API}/admin/payment-config`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.wechat) setWechat(prev => ({ ...prev, ...data.wechat }));
        if (data.alipay) setAlipay(prev => ({ ...prev, ...data.alipay }));
      }
    } catch { /* empty */ }
  };

  const saveWechat = async () => {
    setSaving(true);
    setMsg('');
    try {
      const token = localStorage.getItem('flower_token');
      const body: any = {
        appId: wechat.appId,
        mchId: wechat.mchId,
        serialNo: wechat.serialNo,
        notifyUrl: wechat.notifyUrl,
        enabled: wechat.enabled,
      };
      if (wechat.apiV3Key) body.apiV3Key = wechat.apiV3Key;
      if (wechat.privateKey) body.privateKey = wechat.privateKey;

      const res = await fetch(`${API}/admin/wechat-pay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('✅ ' + data.message);
        await loadConfig();
      } else {
        setMsg('❌ ' + data.error);
      }
    } catch (err: any) {
      setMsg('❌ 保存失败: ' + err.message);
    }
    setSaving(false);
  };

  const saveAlipay = async () => {
    setSaving(true);
    setMsg('');
    try {
      const token = localStorage.getItem('flower_token');
      const body: any = {
        appId: alipay.appId,
        notifyUrl: alipay.notifyUrl,
        gateway: alipay.gateway,
        enabled: alipay.enabled,
      };
      if (alipay.merchantPrivateKey) body.merchantPrivateKey = alipay.merchantPrivateKey;
      if (alipay.alipayPublicKey) body.alipayPublicKey = alipay.alipayPublicKey;

      const res = await fetch(`${API}/admin/alipay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('✅ ' + data.message);
        await loadConfig();
      } else {
        setMsg('❌ ' + data.error);
      }
    } catch (err: any) {
      setMsg('❌ 保存失败: ' + err.message);
    }
    setSaving(false);
  };

  const testConnection = async (type: 'wechat' | 'alipay') => {
    setTesting(true);
    setMsg('');
    try {
      const token = localStorage.getItem('flower_token');
      const res = await fetch(`${API}/admin/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      setMsg(data.success ? '✅ ' + data.message : '❌ ' + data.message);
    } catch (err: any) {
      setMsg('❌ 测试失败: ' + err.message);
    }
    setTesting(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-stone-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl animate-pulse mb-2">👑</div>
          <p className="text-sm text-stone-500">正在恢复登录状态...</p>
        </div>
      </main>
    );
  }

  if (!(user as any)?.isSuperAdmin) {
    return (
      <main className="min-h-screen bg-white text-stone-900 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-4xl mb-3">🔒</div>
          <p className="text-sm text-stone-500 mb-4">需要超级管理员登录</p>
          <a href="/login" className="bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold">去登录</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-stone-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-stone-200/60 px-6 py-4">
        <h1 className="text-lg font-bold text-center">👑 管理后台</h1>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4 flex gap-2">
        {[
          { key: 'overview' as Tab, label: '概览', icon: '📊' },
          { key: 'wechat' as Tab, label: '微信支付', icon: '💚' },
          { key: 'alipay' as Tab, label: '支付宝', icon: '💙' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all ${tab === t.key ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-500'}`}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        {/* Message */}
        {msg && (
          <div className={`rounded-xl p-3 text-sm ${msg.startsWith('✅') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {msg}
          </div>
        )}

        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="space-y-4">
            {/* System Info */}
            <div className="rounded-xl border border-stone-200 p-5">
              <h2 className="font-bold text-sm mb-4">系统状态</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-stone-50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">💚</div>
                  <div className="text-xs font-semibold">微信支付</div>
                  <div className={`text-[10px] mt-1 ${wechat.enabled ? 'text-emerald-600' : 'text-stone-400'}`}>
                    {wechat.mchId ? (wechat.enabled ? '已启用' : '已配置/未启用') : '未配置'}
                  </div>
                </div>
                <div className="bg-stone-50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">💙</div>
                  <div className="text-xs font-semibold">支付宝</div>
                  <div className={`text-[10px] mt-1 ${alipay.enabled ? 'text-blue-600' : 'text-stone-400'}`}>
                    {alipay.appId ? (alipay.enabled ? '已启用' : '已配置/未启用') : '未配置'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Config Checklist */}
            <div className="rounded-xl border border-stone-200 p-5">
              <h2 className="font-bold text-sm mb-4">配置清单</h2>
              <div className="space-y-2.5">
                {[
                  { label: '微信商户号', done: !!wechat.mchId },
                  { label: '微信 V3 API 密钥', done: wechat.apiV3KeySet },
                  { label: '微信证书序列号', done: !!wechat.serialNo },
                  { label: '微信商户私钥', done: wechat.privateKeySet },
                  { label: '支付宝 AppID', done: !!alipay.appId },
                  { label: '支付宝应用私钥', done: alipay.merchantPrivateKeySet },
                  { label: '支付宝公钥', done: alipay.alipayPublicKeySet },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-400'}`}>
                      {item.done ? '✓' : '○'}
                    </span>
                    <span className="text-xs text-stone-700">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Info */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">👑</span>
                <div>
                  <p className="font-bold text-sm text-emerald-900">超级管理员</p>
                  <p className="text-xs text-emerald-700">{(user as any)?.phone}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WeChat Pay Tab */}
        {tab === 'wechat' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-stone-200 p-5 space-y-4">
              <h2 className="font-bold text-sm">微信支付 V3 配置</h2>

              {/* Enable Toggle */}
              <div className="flex items-center justify-between bg-stone-50 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium">启用微信支付</p>
                  <p className="text-[10px] text-stone-400">配置完成后再启用</p>
                </div>
                <button
                  onClick={() => setWechat({ ...wechat, enabled: !wechat.enabled })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${wechat.enabled ? 'bg-emerald-600' : 'bg-stone-300'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${wechat.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* AppID */}
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">AppID（小程序/公众号）</label>
                <input
                  value={wechat.appId}
                  onChange={e => setWechat({ ...wechat, appId: e.target.value })}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                  placeholder="wx..."
                />
              </div>

              {/* MchID */}
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">商户号 (mchid) <span className="text-red-400">*</span></label>
                <input
                  value={wechat.mchId}
                  onChange={e => setWechat({ ...wechat, mchId: e.target.value })}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                  placeholder="16xxxxxx"
                />
              </div>

              {/* V3 API Key */}
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">
                  V3 API 密钥 {wechat.apiV3KeySet && <span className="text-emerald-600">（已设置）</span>}
                </label>
                <input
                  type="password"
                  value={wechat.apiV3Key}
                  onChange={e => setWechat({ ...wechat, apiV3Key: e.target.value })}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                  placeholder={wechat.apiV3KeySet ? '留空保留原值' : '32位 API v3 密钥'}
                />
              </div>

              {/* Serial No */}
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">商户证书序列号</label>
                <input
                  value={wechat.serialNo}
                  onChange={e => setWechat({ ...wechat, serialNo: e.target.value })}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                  placeholder="证书序列号"
                />
              </div>

              {/* Private Key */}
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">
                  商户私钥 (apiclient_key.pem) {wechat.privateKeySet && <span className="text-emerald-600">（已设置）</span>}
                </label>
                <textarea
                  value={wechat.privateKey}
                  onChange={e => setWechat({ ...wechat, privateKey: e.target.value })}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-emerald-400 h-24 resize-none"
                  placeholder={wechat.privateKeySet ? '留空保留原值' : '-----BEGIN PRIVATE KEY-----...'}
                />
              </div>

              {/* Notify URL */}
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">支付回调地址</label>
                <input
                  value={wechat.notifyUrl}
                  onChange={e => setWechat({ ...wechat, notifyUrl: e.target.value })}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => testConnection('wechat')}
                disabled={testing || !wechat.mchId}
                className="flex-1 bg-stone-100 text-stone-700 py-3 rounded-xl text-sm font-medium hover:bg-stone-200 transition-colors disabled:opacity-50"
              >
                {testing ? '测试中...' : '🔍 测试连接'}
              </button>
              <button
                onClick={saveWechat}
                disabled={saving || !wechat.mchId}
                className="flex-1 bg-emerald-700 text-white py-3 rounded-xl text-sm font-bold hover:bg-emerald-800 transition-colors disabled:opacity-50"
              >
                {saving ? '保存中...' : '💾 保存配置'}
              </button>
            </div>
          </div>
        )}

        {/* Alipay Tab */}
        {tab === 'alipay' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-stone-200 p-5 space-y-4">
              <h2 className="font-bold text-sm">支付宝配置</h2>

              {/* Enable Toggle */}
              <div className="flex items-center justify-between bg-stone-50 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium">启用支付宝</p>
                  <p className="text-[10px] text-stone-400">配置完成后再启用</p>
                </div>
                <button
                  onClick={() => setAlipay({ ...alipay, enabled: !alipay.enabled })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${alipay.enabled ? 'bg-blue-600' : 'bg-stone-300'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${alipay.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* AppID */}
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">应用 AppID <span className="text-red-400">*</span></label>
                <input
                  value={alipay.appId}
                  onChange={e => setAlipay({ ...alipay, appId: e.target.value })}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="2021..."
                />
              </div>

              {/* Merchant Private Key */}
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">
                  应用私钥 {alipay.merchantPrivateKeySet && <span className="text-blue-600">（已设置）</span>}
                </label>
                <textarea
                  value={alipay.merchantPrivateKey}
                  onChange={e => setAlipay({ ...alipay, merchantPrivateKey: e.target.value })}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-blue-400 h-20 resize-none"
                  placeholder={alipay.merchantPrivateKeySet ? '留空保留原值' : 'MIIEvQ...'}
                />
              </div>

              {/* Alipay Public Key */}
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">
                  支付宝公钥 {alipay.alipayPublicKeySet && <span className="text-blue-600">（已设置）</span>}
                </label>
                <textarea
                  value={alipay.alipayPublicKey}
                  onChange={e => setAlipay({ ...alipay, alipayPublicKey: e.target.value })}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-blue-400 h-20 resize-none"
                  placeholder={alipay.alipayPublicKeySet ? '留空保留原值' : 'MIIBIjANBg...'}
                />
              </div>

              {/* Notify URL */}
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">支付回调地址</label>
                <input
                  value={alipay.notifyUrl}
                  onChange={e => setAlipay({ ...alipay, notifyUrl: e.target.value })}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="https://..."
                />
              </div>

              {/* Gateway */}
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">网关地址</label>
                <select
                  value={alipay.gateway}
                  onChange={e => setAlipay({ ...alipay, gateway: e.target.value })}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                >
                  <option value="https://openapi.alipay.com/gateway.do">正式环境</option>
                  <option value="https://openapi-sandbox.dl.alipaydev.com/gateway.do">沙箱环境</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => testConnection('alipay')}
                disabled={testing || !alipay.appId}
                className="flex-1 bg-stone-100 text-stone-700 py-3 rounded-xl text-sm font-medium hover:bg-stone-200 transition-colors disabled:opacity-50"
              >
                {testing ? '测试中...' : '🔍 测试连接'}
              </button>
              <button
                onClick={saveAlipay}
                disabled={saving || !alipay.appId}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? '保存中...' : '💾 保存配置'}
              </button>
            </div>
          </div>
        )}
      </div>

      <TabBar />
    </main>
  );
}
