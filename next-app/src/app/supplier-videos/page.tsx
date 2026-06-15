'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://100.76.15.64:3010/api';

interface SupplierInfo {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  description?: string;
}

interface VideoItem {
  id: string;
  productId?: string;
  supplierId: string;
  supplierName: string;
  title: string;
  description: string;
  price: number;
  category?: string;
  cover?: string;
  videoUrl?: string;
  likes: number;
  comments: number;
}

function VideoCard({ item, active }: { item: VideoItem; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) v.play().catch(() => {});
    else v.pause();
  }, [active]);

  return (
    <section className="relative h-screen w-full snap-start snap-always overflow-hidden bg-black flex items-center justify-center">
      {/* Media */}
      {item.videoUrl ? (
        <video
          ref={videoRef}
          src={item.videoUrl}
          poster={item.cover}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          muted
          playsInline
          controls={false}
        />
      ) : item.cover ? (
        <img
          src={item.cover}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover animate-[slowZoom_8s_ease-in-out_infinite_alternate]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 to-stone-950 flex items-center justify-center">
          <span className="text-8xl opacity-30">🌿</span>
        </div>
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
      <div className="absolute inset-0 bg-black/10" />

      {/* Right actions */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-5 text-white">
        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-2xl">❤️</div>
          <span className="text-xs font-semibold">{item.likes}</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-2xl">💬</div>
          <span className="text-xs font-semibold">{item.comments}</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-2xl">🛒</div>
          <span className="text-xs font-semibold">购买</span>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute left-4 right-20 bottom-10 text-white">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-full bg-emerald-500/90 flex items-center justify-center text-lg">🌸</div>
          <div>
            <p className="text-sm font-bold">@{item.supplierName}</p>
            <p className="text-[10px] text-white/60">产地实拍 · 商家短视频</p>
          </div>
        </div>
        <h2 className="text-lg font-bold leading-tight mb-1 line-clamp-2">{item.title}</h2>
        <p className="text-xs text-white/75 leading-relaxed line-clamp-2 mb-2">{item.description}</p>
        <div className="flex items-center gap-2">
          {item.price > 0 && <span className="bg-emerald-500 text-white text-sm font-bold px-3 py-1 rounded-full">¥{item.price.toFixed(2)}</span>}
          {item.category && <span className="bg-white/15 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur">{item.category}</span>}
          {!item.videoUrl && <span className="bg-amber-500/90 text-white text-[10px] px-2 py-1 rounded-full">图片短视频</span>}
        </div>
      </div>
    </section>
  );
}

function SupplierVideosContent() {
  const router = useRouter();
  const params = useSearchParams();
  const supplierId = params.get('supplierId') || '';
  const supplierName = params.get('name') || '';
  const [supplier, setSupplier] = useState<SupplierInfo | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const qs = supplierName ? `?name=${encodeURIComponent(supplierName)}` : '';
        const res = await fetch(`${API}/map/supplier-video-feed/${supplierId}${qs}`);
        const data = await res.json();
        setSupplier(data.supplier || null);
        setVideos(data.videos || []);
      } catch {
        setVideos([]);
      }
      setLoading(false);
    };
    if (supplierId) load();
  }, [supplierId, supplierName]);

  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / window.innerHeight);
    if (idx !== activeIndex) setActiveIndex(idx);
  };

  if (loading) {
    return (
      <main className="h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl animate-pulse mb-3">🎬</div>
          <p className="text-sm text-white/60">正在加载商家短视频...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen bg-black text-white overflow-hidden">
      <style jsx global>{`
        @keyframes slowZoom { from { transform: scale(1); } to { transform: scale(1.12); } }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-4 bg-gradient-to-b from-black/60 to-transparent">
        <button
          onClick={() => router.push('/map')}
          className="w-10 h-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-xl hover:bg-white/25 transition-colors"
          aria-label="退出短视频"
        >
          ✕
        </button>
        <div className="text-center">
          <p className="text-sm font-bold">{supplier?.name || supplierName || '商家短视频'}</p>
          <p className="text-[10px] text-white/60">{videos.length} 条实拍 · 上下滑动查看</p>
        </div>
        <button
          onClick={() => router.push('/map')}
          className="text-xs bg-white/15 backdrop-blur px-3 py-2 rounded-full hover:bg-white/25 transition-colors"
        >
          地图
        </button>
      </div>

      {videos.length === 0 ? (
        <div className="h-screen flex items-center justify-center text-center px-8">
          <div>
            <div className="text-6xl mb-4">🎥</div>
            <h1 className="text-xl font-bold mb-2">暂无短视频</h1>
            <p className="text-sm text-white/50 mb-6">这个商家还没有上传商品视频或图片。</p>
            <button onClick={() => router.push('/map')} className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-bold">返回地图</button>
          </div>
        </div>
      ) : (
        <div
          ref={containerRef}
          onScroll={onScroll}
          className="h-screen w-full overflow-y-scroll snap-y snap-mandatory"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {videos.map((v, i) => <VideoCard key={v.id} item={v} active={i === activeIndex} />)}
        </div>
      )}
    </main>
  );
}

export default function SupplierVideosPage() {
  return (
    <Suspense fallback={<main className="h-screen bg-black text-white flex items-center justify-center">加载中...</main>}>
      <SupplierVideosContent />
    </Suspense>
  );
}
