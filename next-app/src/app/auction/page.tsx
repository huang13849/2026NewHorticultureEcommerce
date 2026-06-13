'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import TabBar from '../TabBar';

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
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bidName, setBidName] = useState('');
  const [bidPhone, setBidPhone] = useState('');
  const [bidding, setBidding] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://100.76.15.64:3010/api';

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`${API}/auction/items`);
      const data = await res.json();
      setItems(data.items || []);
    } catch {}
    setLoading(false);
  }, [API]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // 轮询拍卖状态
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
        } catch {}
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [items, API]);

  const handleStartAuction = async (productId: string) => {
    try {
      const res = await fetch(`${API}/auction/start/${productId}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage(`拍卖已开始！倒计时10分钟`);
        fetchItems();
      } else {
        setMessage(data.error || '启动失败');
      }
    } catch {
      setMessage('网络错误');
    }
  };

  const handleBid = async (productId: string) => {
    if (!bidName || !bidPhone) {
      setMessage('请填写姓名和手机号');
      return;
    }
    setBidding(productId);
    try {
      const res = await fetch(`${API}/auction/bid/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidderName: bidName, bidderPhone: bidPhone }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`竞价成功！当前价 ¥${data.currentPrice}`);
        fetchItems();
      } else {
        setMessage(data.error || '竞价失败');
      }
    } catch {
      setMessage('网络错误');
    }
    setBidding(null);
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <main className="min-h-screen bg-[#0a0e1a] text-white pb-24">
        {/* Header */}
        <nav className="sticky top-0 z-50 bg-[#0a0e1a]/90 backdrop-blur-md border-b border-white/5">
          <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏛</span>
              <span className="text-gold font-bold tracking-[3px] text-xs">珍稀苗木拍卖</span>
            </div>
            <span className="badge">每次加价 ¥5</span>
          </div>
        </nav>

        {/* 9点标识 */}
        <div className="max-w-6xl mx-auto px-6 pt-4">
          <div className="card p-3 flex items-center gap-3 border-[#c9a84c]/20">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="text-sm font-semibold text-[#c9a84c]">每日上午 9:00 开拍</p>
              <p className="text-xs text-[#6b7280]">倒计时10分钟，每次竞价加价5元</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-3xl animate-pulse">⏳</div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-[#6b7280]">暂无拍卖商品</div>
        ) : (
          <div className="max-w-6xl mx-auto px-6 pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => {
              const isExpanded = expandedId === item.productId;
              const isActive = item.status === 'active';
              const isEnded = item.status === 'ended' || (item.remainingSeconds <= 0 && item.status === 'active');
              const isUpcoming = item.status === 'upcoming' || item.status === 'pending';

              return (
                <div key={item.productId} className="card overflow-hidden">
                  {/* Image area */}
                  <div className="h-48 bg-[#111827] relative flex items-center justify-center overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-6xl opacity-30">🌳</span>
                    )}
                    {/* Status badge */}
                    <div className="absolute top-2 left-2">
                      {isActive && (
                        <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded animate-pulse">
                          🔴 LIVE
                        </span>
                      )}
                      {isEnded && (
                        <span className="bg-gray-600 text-white text-[10px] font-bold px-2 py-1 rounded">
                          已结束
                        </span>
                      )}
                      {isUpcoming && (
                        <span className="bg-[#c9a84c] text-[#0a0e1a] text-[10px] font-bold px-2 py-1 rounded">
                          待开拍
                        </span>
                      )}
                    </div>
                    {item.isToday9am && (
                      <div className="absolute top-2 right-2">
                        <span className="bg-[#2dd4a0] text-[#0a0e1a] text-[10px] font-bold px-2 py-1 rounded">
                          今日9点
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-sm font-bold mb-1 truncate">{item.title}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-[#6b7280] mb-2">
                      {item.category && <span className="badge text-[9px] py-0.5">{item.category}</span>}
                      {item.origin && <span>📍{item.origin}</span>}
                      {item.specSize && <span>📏{item.specSize}</span>}
                    </div>

                    {/* Price */}
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <p className="text-[10px] text-[#6b7280]">起拍价</p>
                        <p className="text-xs text-[#6b7280] line-through">¥{item.basePrice}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-[#c9a84c]">当前价</p>
                        <p className="text-xl font-bold text-[#c9a84c]">¥{item.currentPrice}</p>
                      </div>
                    </div>

                    {/* Bidder info */}
                    {item.currentBidder && (
                      <p className="text-xs text-[#9ca3af] mb-2">
                        最高出价: {item.currentBidder.name} · {item.bidCount}次出价
                      </p>
                    )}

                    {/* Countdown */}
                    {isActive && item.remainingSeconds > 0 && (
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <span className="text-[10px] text-[#6b7280]">剩余</span>
                        <span className="cd text-lg py-1 px-3">{formatCountdown(item.remainingSeconds)}</span>
                      </div>
                    )}

                    {/* Actions */}
                    {isUpcoming && (
                      <button
                        onClick={() => handleStartAuction(item.productId)}
                        className="w-full btn-primary text-[11px] py-2"
                      >
                        开始拍卖
                      </button>
                    )}

                    {isActive && !isEnded && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.productId)}
                        className="w-full btn-primary text-[11px] py-2"
                      >
                        🔨 竞价 +¥{item.bidIncrement}
                      </button>
                    )}

                    {isEnded && item.currentBidder && (
                      <Link
                        href={`/payment?auction=${item.productId}`}
                        className="w-full btn-primary text-[11px] py-2 block text-center"
                      >
                        去支付 ¥{item.currentPrice}
                      </Link>
                    )}

                    {/* Bid form (expanded) */}
                    {isExpanded && isActive && (
                      <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                        <input
                          type="text"
                          placeholder="您的姓名"
                          value={bidName}
                          onChange={e => setBidName(e.target.value)}
                          className="w-full bg-[#111827] border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-[#4b5563]"
                        />
                        <input
                          type="tel"
                          placeholder="手机号"
                          value={bidPhone}
                          onChange={e => setBidPhone(e.target.value)}
                          className="w-full bg-[#111827] border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-[#4b5563]"
                        />
                        <button
                          onClick={() => handleBid(item.productId)}
                          disabled={bidding === item.productId}
                          className="w-full bg-[#c9a84c] text-[#0a0e1a] py-2 rounded text-[11px] font-bold disabled:opacity-40"
                        >
                          {bidding === item.productId ? '出价中...' : `确认出价 ¥${item.currentPrice + item.bidIncrement}`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Message */}
        {message && (
          <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 bg-[#111827] border border-[#c9a84c]/30 rounded-lg px-4 py-2 text-sm text-[#c9a84c] shadow-lg">
            {message}
            <button onClick={() => setMessage('')} className="ml-2 text-[#6b7280]">✕</button>
          </div>
        )}
      </main>
      <TabBar />
    </>
  );
}
