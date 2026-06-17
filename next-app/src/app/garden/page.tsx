'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, GardenPlot, Plant } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import LoginPrompt from '../components/LoginPrompt';
import { useI18n } from '@/lib/i18n/context';
import LangSwitch from '@/app/components/LangSwitch';

export default function GardenPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [myGarden, setMyGarden] = useState<GardenPlot[]>([]);
  const [gardenStats, setGardenStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      if (!user) {
        // 未登录也可以看可种植物列表
        const plantsData = await api.getPlants();
        setPlants(plantsData.plants || []);
        return;
      }
      const [plantsData, gardenData] = await Promise.all([
        api.getPlants(),
        api.getMyGarden(),
      ]);
      setPlants(plantsData.plants || []);
      setMyGarden(gardenData.garden || []);
      setGardenStats(gardenData.stats || {});
    } catch (e) {
      console.error('Load garden error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) loadData();
  }, [authLoading, loadData]);

  const handlePlant = async (plantId: string) => {
    if (!user) return;
    try {
      const result = await api.plantSeed(plantId);
      alert(result.message);
      loadData();
    } catch (e: any) {
      alert(e.message || '种植失败');
    }
  };

  const handleWater = async (plotId: string) => {
    try {
      const result = await api.waterPlot(plotId);
      alert(result.message);
      loadData();
    } catch (e: any) {
      alert(e.message || '浇水失败');
    }
  };

  const handleClaim = async (plotId: string) => {
    try {
      const result = await api.claimGift(plotId);
      alert(result.message);
      loadData();
    } catch (e: any) {
      alert(e.message || '领取失败');
    }
  };

  if (authLoading || loading) {
    return (
      <main className="max-w-lg mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin text-3xl mb-2">🌱</div>
          <p className="text-gray-400 text-sm">{t('common.loading')}</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="max-w-lg mx-auto">
        <LoginPrompt message="登录后即可种花 & 免费领取" />
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto pb-4">
      {/* 我的花园区域 */}
      <section className="px-4 pt-4">
        <h2 className="text-xl font-bold text-gray-800">🌿 我的花园</h2>

        {myGarden.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center mt-3">
            <p className="text-gray-400">还没有种花哦~</p>
            <p className="text-gray-300 text-sm mt-1">选择下面的花种开始种植吧！</p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {myGarden.map((plot) => (
              <div
                key={plot.id}
                className={`bg-white rounded-2xl p-4 shadow-sm ${
                  plot.isMature ? 'border-2 border-yellow-400' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{plot.currentStageEmoji || '🌱'}</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{plot.plantName}</h3>
                    <p className="text-sm text-yellow-800">
                      {plot.isMature
                        ? '🌸 已成熟！可领取'
                        : `第 ${plot.daysPassed}/${plot.totalDays} 天`}
                    </p>
                  </div>
                </div>

                {/* 进度条 */}
                <div className="mt-3">
                  <div className="h-2 bg-green-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${plot.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 text-right mt-1">{plot.progress}%</p>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2 mt-3">
                  {!plot.isMature && (
                    <button
                      onClick={() => handleWater(plot.id)}
                      disabled={!plot.canWater}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        plot.canWater
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      💧 {plot.canWater ? t('garden.water') : '已浇'}
                    </button>
                  )}
                  {plot.isMature && (
                    <button
                      onClick={() => handleClaim(plot.id)}
                      className="flex-1 bg-orange-500 text-white py-1.5 rounded-full text-sm font-medium hover:bg-orange-600 transition-colors"
                    >
                      🎁 免费领取
                    </button>
                  )}
                </div>

                {plot.checkInDates.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    📅 已打卡 {plot.checkInDates.length} 天
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 可种植的花卉 */}
      <section className="px-4 mt-6">
        <h2 className="text-xl font-bold text-gray-800">🌱 选择种植</h2>
        <p className="text-sm text-yellow-800 mt-1 mb-3">种满 100 天即可免费获赠！</p>

        <div className="grid grid-cols-2 gap-3">
          {plants.map((plant) => (
            <button
              key={plant._id}
              onClick={() => handlePlant(plant._id)}
              className="bg-white rounded-2xl p-4 text-center shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="text-5xl">{plant.emoji}</p>
              <h3 className="font-bold text-gray-800 mt-2">{plant.name}</h3>
              <p className="text-xs text-yellow-800 mt-1">{plant.growDays}天成熟</p>
              <p className="text-xs mt-1">
                {plant.difficulty === 'easy' ? '⭐' : plant.difficulty === 'medium' ? '⭐⭐' : '⭐⭐⭐'}
              </p>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
