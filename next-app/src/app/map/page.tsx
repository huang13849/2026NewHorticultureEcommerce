'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, MapMarker } from '@/lib/api';
import MapPlaceholder from './MapPlaceholder';

export default function MapPage() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<MapMarker | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');

  const loadMapData = useCallback(async () => {
    try {
      // 默认北京位置
      const data = await api.getMapViewport(116.3, 39.9, 116.5, 40.0);
      setMarkers(data.markers || []);
    } catch (e) {
      console.error('Map load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMapData(); }, [loadMapData]);

  if (loading) {
    return (
      <main className="max-w-lg mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin text-3xl mb-2">🗺️</div>
          <p className="text-gray-400 text-sm">加载地图数据...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto pb-4">
      {/* 地图占位区域 */}
      <MapPlaceholder onRefresh={loadMapData} />

      {/* 供应商/商品列表 */}
      <div className="px-4 mt-4">
        <h2 className="text-lg font-bold text-gray-800 mb-3">
          附近 {markers.length} 家花店
        </h2>

        {markers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">暂无附近花店数据</p>
            <p className="text-gray-300 text-sm mt-1">请确认供应商数据包含位置信息</p>
          </div>
        ) : (
          <div className="space-y-3">
            {markers.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedSupplier(m)}
                className="w-full flex items-start gap-3 bg-white rounded-xl p-4 text-left shadow-sm hover:shadow-md transition-shadow"
              >
                <span className="text-3xl flex-shrink-0">🏪</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-gray-800">{m.name}</h3>
                  <p className="text-sm text-yellow-800 mt-1">
                    🌸 {m.productCount} 种花卉 · ¥{Math.round(m.avgPrice)} 起
                  </p>
                  {m.address && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{m.address}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
