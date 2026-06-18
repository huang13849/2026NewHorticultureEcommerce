'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

export type RegionCode = 'cn' | 'us' | 'de';

export interface RegionTheme {
  code: RegionCode;
  flag: string;
  label: string;
  shortLabel: string;
  recommended: boolean;
  lat: number;
  lng: number;
  badge: string;
  title: string;
  subtitle: string;
  desc: string;
  plantLine: string;
  heroEmoji: string;
  navClass: string;
  pageClass: string;
  accentText: string;
  accentBg: string;
  accentBgHover: string;
  accentBorder: string;
  accentSoft: string;
  heroPanel: string;
  cardHover: string;
  certGradient: string;
  imageFallback: string;
}

export const REGIONS: RegionTheme[] = [
  {
    code: 'cn', flag: '🇨🇳', label: '中国', shortLabel: '中国', recommended: false,
    lat: 39.9042, lng: 116.4074,
    badge: '中国区 · 中式园林供应链', title: '植物猎人', subtitle: '供应链新体验',
    desc: '以中式园林和北方花木市场为核心，连接产地、商家与庭院场景。苗木拍卖、鲜花倒拍、地图购花、花园种植，一站式完成。',
    plantLine: '推荐：牡丹、罗汉松、白皮松、桂花、月季、国风盆景', heroEmoji: '🏮',
    navClass: 'bg-white/85 border-stone-200/60',
    pageClass: 'bg-[radial-gradient(circle_at_top_left,#fff7ed,transparent_32%),linear-gradient(180deg,#fff,#f8faf7)]',
    accentText: 'text-emerald-700', accentBg: 'bg-emerald-700', accentBgHover: 'hover:bg-emerald-800',
    accentBorder: 'border-emerald-200', accentSoft: 'bg-emerald-50',
    heroPanel: 'bg-gradient-to-br from-emerald-50 via-amber-50 to-red-50', cardHover: 'hover:border-emerald-300',
    certGradient: 'from-emerald-700 via-emerald-800 to-stone-900', imageFallback: '🌿',
  },
  {
    code: 'us', flag: '🇺🇸', label: '美国', shortLabel: '美国', recommended: true,
    lat: 37.7749, lng: -122.4194,
    badge: '美国区 · 美式花园供应链', title: 'Plant Hunter', subtitle: '供应链新体验',
    desc: '面向美式庭院、花园中心与社区绿化场景，突出原产地直连、地图采购和稳定履约，让绿植花卉采购更像一次植物狩猎。',
    plantLine: '推荐：绣球、薰衣草、玫瑰、多肉、观赏草、庭院乔木', heroEmoji: '🌵',
    navClass: 'bg-sky-50/85 border-sky-100',
    pageClass: 'bg-[radial-gradient(circle_at_top_left,#e0f2fe,transparent_34%),linear-gradient(180deg,#ffffff,#f0f9ff)]',
    accentText: 'text-sky-700', accentBg: 'bg-sky-700', accentBgHover: 'hover:bg-sky-800',
    accentBorder: 'border-sky-200', accentSoft: 'bg-sky-50',
    heroPanel: 'bg-gradient-to-br from-sky-50 via-lime-50 to-orange-50', cardHover: 'hover:border-sky-300',
    certGradient: 'from-sky-700 via-cyan-800 to-slate-900', imageFallback: '🌵',
  },
  {
    code: 'de', flag: '🇩🇪', label: '德国', shortLabel: '德国', recommended: true,
    lat: 52.52, lng: 13.405,
    badge: '德国区 · 欧式森林花园供应链', title: 'Plant Hunter', subtitle: '供应链新体验',
    desc: '面向欧式花园、森林系景观和可持续园艺采购，强调绿色认证、碳汇价值、产地追踪与严谨的供应链履约。',
    plantLine: '推荐：铁线莲、矢车菊、香草植物、球根花卉、云杉、欧洲山毛榉', heroEmoji: '🌲',
    navClass: 'bg-stone-50/85 border-stone-200/70',
    pageClass: 'bg-[radial-gradient(circle_at_top_left,#ecfccb,transparent_30%),linear-gradient(180deg,#fff,#f5f5f4)]',
    accentText: 'text-lime-800', accentBg: 'bg-lime-800', accentBgHover: 'hover:bg-lime-900',
    accentBorder: 'border-lime-200', accentSoft: 'bg-lime-50',
    heroPanel: 'bg-gradient-to-br from-lime-50 via-stone-50 to-amber-50', cardHover: 'hover:border-lime-300',
    certGradient: 'from-lime-800 via-emerald-900 to-stone-950', imageFallback: '🌲',
  },
];

const REGION_MAP = Object.fromEntries(REGIONS.map((r) => [r.code, r])) as Record<RegionCode, RegionTheme>;

function detectRegion(latitude: number, longitude: number): RegionCode {
  if (latitude >= 18 && latitude <= 54 && longitude >= 73 && longitude <= 135) return 'cn';
  if (latitude >= 18 && latitude <= 72 && longitude >= -170 && longitude <= -50) return 'us';
  if (latitude >= 47 && latitude <= 55.5 && longitude >= 5 && longitude <= 16) return 'de';
  return 'cn';
}

function detectRegionByCountry(countryCode?: string): RegionCode | null {
  const c = (countryCode || '').toUpperCase();
  if (c === 'CN' || c === 'HK' || c === 'MO' || c === 'TW') return 'cn';
  if (c === 'US') return 'us';
  if (c === 'DE') return 'de';
  return null;
}

function detectRegionByTimezone(): RegionCode {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  if (tz.includes('Shanghai') || tz.includes('Hong_Kong') || tz.includes('Macau') || tz.includes('Taipei')) return 'cn';
  if (tz.startsWith('America/')) return 'us';
  if (tz === 'Europe/Berlin') return 'de';
  return 'cn';
}

interface RegionContextValue {
  region: RegionTheme;
  setRegionCode: (code: RegionCode) => void;
  locating: boolean;
  locateError: string;
  detectFromBrowser: () => void;
}

const RegionContext = createContext<RegionContextValue>({
  region: REGION_MAP.cn,
  setRegionCode: () => {},
  locating: false,
  locateError: '',
  detectFromBrowser: () => {},
});

export function RegionProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState<RegionCode>('cn');
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('plantHunterRegion') as RegionCode | null;
    if (stored && REGION_MAP[stored]) setCode(stored);
  }, []);

  const setRegionCode = (next: RegionCode) => {
    setCode(next);
    localStorage.setItem('plantHunterRegion', next);
    setLocateError('');
  };

  const applyFallbackLocation = async (reason: string) => {
    try {
      const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
      const data = await res.json();
      const byCountry = detectRegionByCountry(data?.country_code);
      if (byCountry) {
        setRegionCode(byCountry);
        setLocateError(`已用网络位置识别：${REGION_MAP[byCountry].label}`);
        return;
      }
    } catch { /* network fallback ignored */ }
    const byTimezone = detectRegionByTimezone();
    setRegionCode(byTimezone);
    setLocateError(`${reason}，已按时区识别：${REGION_MAP[byTimezone].label}`);
  };

  const detectFromBrowser = () => {
    setLocating(true);
    setLocateError('');
    if (!navigator.geolocation || (typeof window !== 'undefined' && !window.isSecureContext)) {
      applyFallbackLocation('浏览器精确定位不可用').finally(() => setLocating(false));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = detectRegion(pos.coords.latitude, pos.coords.longitude);
        setRegionCode(next);
        setLocateError(`已用当前位置识别：${REGION_MAP[next].label}`);
        setLocating(false);
      },
      () => {
        applyFallbackLocation('精确定位失败').finally(() => setLocating(false));
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 1000 * 60 * 30 }
    );
  };

  const value = useMemo(() => ({ region: REGION_MAP[code], setRegionCode, locating, locateError, detectFromBrowser }), [code, locating, locateError]);
  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion() {
  return useContext(RegionContext);
}
