'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

interface Position {
  lat: number;
  lng: number;
}

/**
 * 简单地图组件 — 使用 OpenStreetMap 嵌入 + 浏览器定位
 * 不依赖任何外部 JS 库，只加载 Leaflet CSS + 用 iframe 嵌入 OSM
 */
export default function FlowerMap() {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(true);
  const [shopCount, setShopCount] = useState(0);

  useEffect(() => {
    // 获取地理位置
    try {
      if (!navigator.geolocation) {
        setError('浏览器不支持定位');
        setLocating(false);
        setPosition({ lat: 39.9, lng: 116.4 });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPosition(p);
          setLocating(false);
        },
        (err) => {
          setError(`定位失败: ${err.message}`);
          setLocating(false);
          setPosition({ lat: 39.9, lng: 116.4 });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } catch (e: any) {
      setError('定位错误: ' + e.message);
      setLocating(false);
      setPosition({ lat: 39.9, lng: 116.4 });
    }
  }, []);

  // 加载附近花店数据
  useEffect(() => {
    if (!position) return;
    const margin = 0.15;
    api.getMapViewport(
      position.lng - margin, position.lat - margin,
      position.lng + margin, position.lat + margin
    ).then(data => setShopCount(data.markers?.length || 0))
     .catch(() => {});
  }, [position]);

  // 重新定位
  const handleRelocate = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      (err) => { setError('定位失败: ' + err.message); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (!position && locating) {
    return (
      <div className="w-full h-[400px] rounded-2xl overflow-hidden shadow-lg bg-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin inline-block w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full mb-3" />
          <p className="text-gray-500 text-sm">正在获取位置...</p>
        </div>
      </div>
    );
  }

  // 使用 OpenStreetMap 静态图嵌入
  const mapSrc = position
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${position.lng - 0.02}%2C${position.lat - 0.02}%2C${position.lng + 0.02}%2C${position.lat + 0.02}&layer=mapnik&marker=${position.lat}%2C${position.lng}`
    : '';

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-lg" style={{ height: '400px' }}>
      {mapSrc && (
        <iframe
          title="地图"
          src={mapSrc}
          className="absolute inset-0 w-full h-full border-0"
          loading="lazy"
          allow="geolocation"
        />
      )}

      {/* 定位状态 */}
      {locating && (
        <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl shadow text-sm text-gray-600 flex items-center gap-2">
          <span className="animate-spin inline-block w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full" />
          定位中...
        </div>
      )}

      {error && (
        <div className="absolute top-3 left-3 z-10 bg-yellow-50 px-3 py-2 rounded-xl shadow text-sm text-yellow-700">
          ⚠️ {error}
        </div>
      )}

      {/* 花店数量 */}
      {shopCount > 0 && (
        <div className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl shadow text-sm font-medium text-gray-700">
          🏪 附近 {shopCount} 家
        </div>
      )}

      {/* 重新定位 */}
      <button
        onClick={handleRelocate}
        className="absolute bottom-3 right-3 z-10 bg-white px-3 py-2 rounded-xl shadow-md text-sm font-medium text-green-600 hover:bg-green-50 transition-colors flex items-center gap-1.5"
      >
        📍 重新定位
      </button>
    </div>
  );
}
