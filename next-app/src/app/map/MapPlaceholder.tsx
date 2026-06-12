'use client';

interface Props {
  onRefresh: () => void;
}

export default function MapPlaceholder({ onRefresh }: Props) {
  return (
    <div className="bg-green-50 px-4 pt-6 pb-6 text-center rounded-b-2xl">
      <p className="text-5xl mb-2">🗺️</p>
      <h2 className="text-xl font-bold text-gray-800">地图视图</h2>
      <p className="text-sm text-yellow-800 mt-1">接入地图 SDK 后显示花店位置</p>
      <button
        onClick={onRefresh}
        className="mt-4 bg-green-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-green-700 transition-colors"
      >
        📍 搜索附近花店
      </button>
    </div>
  );
}
