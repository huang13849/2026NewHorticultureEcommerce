'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import TabBar from '../TabBar';
import { useI18n } from '@/lib/i18n/context';
import LangSwitch from '@/app/components/LangSwitch';
import PlantHunterLogo from '@/app/components/PlantHunterLogo';

interface AuctionItem {
  productId: string;
  title: string;
  category: string;
  flowerName: string;
  basePrice: number;
  currentPrice: number;
  currentBidder: { name: string } | null;
  bidCount: number;
  status: string;
  imageUrl: string;
  origin: string;
  specSize: string;
  remainingSeconds: number;
  isToday9am: boolean;
  bidIncrement: number;
}

export default function AuctionPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bidName, setBidName] = useState('');
  const [bidPhone, setBidPhone] = useState('');
  const [bidding, setBidding] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const API = process.env.NEXT_PUBLIC_API_URL || "/api";

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`${API}/auction/items`);
      const data = await res.json();
      setItems(data.items || []);
    } catch { /* empty */ }
    setLoading(false);
  }, [API]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const activeItems = items.filter(i => i.status === 'active');
      for (const item of activeItems) {
        try {
          const res = await fetch(`${API}/auction/status/${item.productId}`);
          const data = await res.json();
          setItems(prev => prev.map(i =>
            i.productId === item.productId
              ? { ...i, currentPrice: data.currentPrice, currentBidder: data.currentBidder, bidCount: data.bidCount, remainingSeconds: data.remainingSeconds, status: data.status }
              : i
          ));
        } catch { /* empty */ }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [items, API]);

  const handleStartAuction = async (productId: string) => {
    try {
      const res = await fetch(`${API}/auction/start/${productId}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) { setMessage('拍卖已开始！倒计时10分钟'); fetchItems(); }
      else { setMessage(data.error || '启动失败'); }
    } catch { setMessage(t('common.networkError')); }
  };

  const handleBid = async (productId: string) => {
    if (!bidName || !bidPhone) { setMessage('请填写姓名和手机号'); return; }
    setBidding(productId);
    try {
      const res = await fetch(`${API}/auction/bid/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidderName: bidName, bidderPhone: bidPhone }),
      });
      const data = await res.json();
      if (res.ok) { setMessage(`竞价成功！当前价 ¥${data.currentPrice}`); fetchItems(); }
      else { setMessage(data.error || t('auction.bidFailed')); }
    } catch { setMessage(t('common.networkError')); }
    setBidding(null);
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <main className="min-h-screen bg-white text-stone-900 pb-20">
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/60">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <PlantHunterLogo />
              <span className="font-semibold tracking-tight text-sm">{t('auction.subtitle')}</span>
            </div>
            <Link href="/reverse-auction" className="text-xs text-emerald-700 font-medium hover:text-emerald-900 transition-colors">鲜花倒拍 →</Link>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-6 pt-6">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200/60 p-5 flex items-center gap-4">
            <PlantHunterLogo size="md" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">批发乔灌木正向拍卖</p>
              <p className="text-xs text-stone-500">{t('auction.rulesDesc')}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="text-3xl animate-pulse">⏳</div></div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-stone-400">暂无乔灌木拍卖商品</div>
        ) : (
          <div className="max-w-6xl mx-auto px-6 pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map(item => {
              const isExpanded = expandedId === item.productId;
              const isActive = item.status === 'active';
              const isEnded = item.status === 'ended' || (item.remainingSeconds <= 0 && item.status === 'active');
              const isUpcoming = item.status === 'upcoming' || item.status === 'pending';

              return (
                <article key={item.productId} className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-48 bg-stone-100 relative flex items-center justify-center overflow-hidden">
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" /> : <span className="text-6xl opacity-20">🌳</span>}
                    <div className="absolute top-3 left-3">
                      {isActive && <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse">🔴 LIVE</span>}
                      {isEnded && <span className="bg-stone-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">{t('auction.ended')}</span>}
                      {isUpcoming && <span className="bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">待开拍</span>}
                    </div>
                    {item.isToday9am && <div className="absolute top-3 right-3"><span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">今日9点</span></div>}
                  </div>
                  <div className="p-5">
                    <h3 className="text-sm font-semibold truncate mb-1">{item.title}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-stone-400 mb-3">
                      {item.category && <span className="bg-stone-50 px-1.5 py-0.5 rounded border border-stone-100">{item.category}</span>}
                      {item.origin && <span>📍{item.origin}</span>}
                      {item.specSize && <span>📏{item.specSize}</span>}
                    </div>
                    <div className="flex items-end justify-between mb-3">
                      <div><p className="text-[10px] text-stone-400">{t('auction.startingPrice')}</p><p className="text-xs text-stone-400 line-through">¥{item.basePrice}</p></div>
                      <div className="text-right"><p className="text-[10px] text-emerald-700 font-medium">{t('reverseAuction.currentPrice')}</p><p className="text-xl font-bold text-emerald-700">¥{item.currentPrice}</p></div>
                    </div>
                    {item.currentBidder && <p className="text-xs text-stone-500 mb-2">最高出价: {item.currentBidder.name} · {item.bidCount}次出价</p>}
                    {isActive && item.remainingSeconds > 0 && (
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <span className="text-[10px] text-stone-400">{t('reverseAuction.timeLeft')}</span>
                        <span className="font-mono text-lg font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1">{formatCountdown(item.remainingSeconds)}</span>
                      </div>
                    )}
                    {isUpcoming && <button onClick={() => handleStartAuction(item.productId)} className="w-full bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors">开始拍卖</button>}
                    {isActive && !isEnded && <button onClick={() => setExpandedId(isExpanded ? null : item.productId)} className="w-full bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors">🔨 竞价 +¥{item.bidIncrement}</button>}
                    {isEnded && item.currentBidder && <Link href={`/payment?auction=${item.productId}`} className="w-full bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors block text-center">去支付 ¥{item.currentPrice}</Link>}
                    {isExpanded && isActive && (
                      <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
                        <input type="text" placeholder="您的姓名" value={bidName} onChange={e => setBidName(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-emerald-300 focus:outline-none" />
                        <input type="tel" placeholder={t('login.phonePlaceholder')} value={bidPhone} onChange={e => setBidPhone(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-emerald-300 focus:outline-none" />
                        <button onClick={() => handleBid(item.productId)} disabled={bidding === item.productId} className="w-full bg-amber-500 text-white py-2 rounded-xl text-xs font-bold disabled:opacity-40 hover:bg-amber-600 transition-colors">{bidding === item.productId ? t('auction.bidding') : `确认出价 ¥${item.currentPrice + item.bidIncrement}`}</button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {message && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] bg-white border border-emerald-200 rounded-xl px-5 py-3 text-sm text-emerald-800 shadow-lg">
            {message}
            <button onClick={() => setMessage('')} className="ml-3 text-stone-400 hover:text-stone-600">✕</button>
          </div>
        )}
      </main>
      <TabBar />
    </>
  );
}
