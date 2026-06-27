'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

export type RegionCode = 'cn' | 'us' | 'de' | 'jp' | 'fr' | 'sa';

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
  skylineClass?: string;
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
    badge: '中国区 · 中式园林供应链', title: '植物收藏家', subtitle: '供应链新体验',
    desc: '以中式园林和北方花木市场为核心，连接产地、商家与庭院场景。苗木拍卖、鲜花拍卖、地图购花、花园种植，一站式完成。',
    plantLine: '推荐：牡丹、罗汉松、白皮松、桂花、月季、国风盆景', heroEmoji: '🏮',
    navClass: 'bg-white/85 border-stone-200/60',
    pageClass: 'bg-[radial-gradient(circle_at_12%_8%,#fee2e2,transparent_18%),radial-gradient(circle_at_88%_12%,#dcfce7,transparent_22%),radial-gradient(circle_at_50%_100%,#fde68a,transparent_26%),linear-gradient(135deg,#fff7ed_0%,#f0fdf4_45%,#fef2f2_100%)]',
    skylineClass: 'before:content-[""] before:absolute before:inset-x-0 before:top-14 before:h-48 before:bg-[linear-gradient(135deg,rgba(146,64,14,.10)_0_18%,transparent_18%_26%,rgba(22,101,52,.10)_26%_42%,transparent_42%_55%,rgba(185,28,28,.08)_55%_70%,transparent_70%)] before:pointer-events-none',
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
    pageClass: 'bg-[radial-gradient(circle_at_15%_10%,#dbeafe,transparent_22%),radial-gradient(circle_at_82%_18%,#fed7aa,transparent_24%),radial-gradient(circle_at_50%_100%,#bbf7d0,transparent_28%),linear-gradient(135deg,#eff6ff_0%,#fff7ed_48%,#ecfccb_100%)]',
    skylineClass: 'before:content-[""] before:absolute before:inset-x-0 before:top-16 before:h-52 before:bg-[linear-gradient(115deg,transparent_0_10%,rgba(2,132,199,.10)_10%_24%,transparent_24%_34%,rgba(234,88,12,.10)_34%_48%,transparent_48%_62%,rgba(101,163,13,.10)_62%_78%,transparent_78%)] before:pointer-events-none',
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
    pageClass: 'bg-[radial-gradient(circle_at_12%_12%,#d9f99d,transparent_22%),radial-gradient(circle_at_78%_10%,#e7e5e4,transparent_24%),radial-gradient(circle_at_46%_100%,#bbf7d0,transparent_28%),linear-gradient(135deg,#f8fafc_0%,#ecfccb_42%,#f5f5f4_100%)]',
    skylineClass: 'before:content-[""] before:absolute before:inset-x-0 before:top-14 before:h-56 before:bg-[linear-gradient(125deg,rgba(63,63,70,.10)_0_16%,transparent_16%_24%,rgba(77,124,15,.12)_24%_46%,transparent_46%_54%,rgba(120,113,108,.10)_54%_74%,transparent_74%)] before:pointer-events-none',
    accentText: 'text-lime-800', accentBg: 'bg-lime-800', accentBgHover: 'hover:bg-lime-900',
    accentBorder: 'border-lime-200', accentSoft: 'bg-lime-50',
    heroPanel: 'bg-gradient-to-br from-lime-50 via-stone-50 to-amber-50', cardHover: 'hover:border-lime-300',
    certGradient: 'from-lime-800 via-emerald-900 to-stone-950', imageFallback: '🌲',
  },

  {
    code: 'jp', flag: '🇯🇵', label: '日本', shortLabel: '日本', recommended: true,
    lat: 35.6762, lng: 139.6503,
    badge: '日本区 · 和风庭园供应链', title: 'Plant Hunter', subtitle: '供应链新体验',
    desc: '面向和风庭园、屋上绿化和精品园艺场景，强调严选产地、精细履约与季节花材供给。',
    plantLine: '推荐：樱花、枫树、绣球、山茶、黑松、苔藓庭园植物', heroEmoji: '🌸',
    navClass: 'bg-rose-50/85 border-rose-100',
    pageClass: 'bg-[radial-gradient(circle_at_16%_10%,#fecdd3,transparent_20%),radial-gradient(circle_at_80%_16%,#fbcfe8,transparent_22%),radial-gradient(circle_at_52%_100%,#fed7aa,transparent_26%),linear-gradient(135deg,#fff1f2_0%,#fdf2f8_46%,#fff7ed_100%)]',
    skylineClass: 'before:content-[""] before:absolute before:inset-x-0 before:top-14 before:h-52 before:bg-[radial-gradient(ellipse_at_22%_28%,rgba(244,63,94,.14),transparent_18%),radial-gradient(ellipse_at_78%_24%,rgba(236,72,153,.12),transparent_18%),linear-gradient(120deg,transparent_0_14%,rgba(190,18,60,.09)_14%_26%,transparent_26%_40%,rgba(251,146,60,.10)_40%_56%,transparent_56%)] before:pointer-events-none',
    accentText: 'text-rose-700', accentBg: 'bg-rose-700', accentBgHover: 'hover:bg-rose-800',
    accentBorder: 'border-rose-200', accentSoft: 'bg-rose-50',
    heroPanel: 'bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50', cardHover: 'hover:border-rose-300',
    certGradient: 'from-rose-700 via-pink-800 to-stone-900', imageFallback: '🌸',
  },

  {
    code: 'fr', flag: '🇫🇷', label: '法国', shortLabel: '法国', recommended: true,
    lat: 48.8566, lng: 2.3522,
    badge: '法国区 · 法式花园供应链', title: 'Plant Hunter', subtitle: '供应链新体验',
    desc: '面向法式花园、庄园景观与城市花艺场景，突出浪漫花境、产区风土和精品园艺履约。',
    plantLine: '推荐：薰衣草、鸢尾、玫瑰、梧桐、葡萄藤、法式花境植物', heroEmoji: '🥐',
    navClass: 'bg-indigo-50/85 border-indigo-100',
    pageClass: 'bg-[radial-gradient(circle_at_14%_12%,#dbeafe,transparent_21%),radial-gradient(circle_at_82%_14%,#fecaca,transparent_23%),radial-gradient(circle_at_48%_100%,#e9d5ff,transparent_28%),linear-gradient(135deg,#eff6ff_0%,#ffffff_45%,#fef2f2_100%)]',
    skylineClass: 'before:content-[""] before:absolute before:inset-x-0 before:top-14 before:h-56 before:bg-[linear-gradient(100deg,transparent_0_12%,rgba(79,70,229,.10)_12%_24%,transparent_24%_36%,rgba(185,28,28,.08)_36%_48%,transparent_48%_58%,rgba(88,28,135,.10)_58%_72%,transparent_72%)] before:pointer-events-none',
    accentText: 'text-indigo-700', accentBg: 'bg-indigo-700', accentBgHover: 'hover:bg-indigo-800',
    accentBorder: 'border-indigo-200', accentSoft: 'bg-indigo-50',
    heroPanel: 'bg-gradient-to-br from-indigo-50 via-white to-rose-50', cardHover: 'hover:border-indigo-300',
    certGradient: 'from-indigo-700 via-blue-800 to-rose-900', imageFallback: '🥐',
  },
  {
    code: 'sa', flag: '🇸🇦', label: '沙特阿拉伯', shortLabel: '沙特', recommended: true,
    lat: 24.7136, lng: 46.6753,
    badge: '沙特区 · 沙漠绿洲供应链', title: 'Plant Hunter', subtitle: '供应链新体验',
    desc: '面向沙漠绿洲、耐旱景观和高端城市绿化场景，突出耐热植物、水资源效率与稳定跨区域履约。',
    plantLine: '推荐：椰枣、棕榈、九重葛、沙漠玫瑰、橄榄、耐旱草本', heroEmoji: '🌴',
    navClass: 'bg-amber-50/85 border-amber-100',
    pageClass: 'bg-[radial-gradient(circle_at_12%_10%,#fde68a,transparent_22%),radial-gradient(circle_at_82%_18%,#bbf7d0,transparent_20%),radial-gradient(circle_at_50%_100%,#fed7aa,transparent_30%),linear-gradient(135deg,#fffbeb_0%,#fef3c7_44%,#ecfdf5_100%)]',
    skylineClass: 'before:content-[""] before:absolute before:inset-x-0 before:top-14 before:h-56 before:bg-[radial-gradient(ellipse_at_18%_26%,rgba(180,83,9,.16),transparent_18%),radial-gradient(ellipse_at_75%_32%,rgba(21,128,61,.14),transparent_16%),linear-gradient(110deg,transparent_0_10%,rgba(146,64,14,.12)_10%_30%,transparent_30%_42%,rgba(5,150,105,.10)_42%_56%,transparent_56%)] before:pointer-events-none',
    accentText: 'text-amber-800', accentBg: 'bg-amber-800', accentBgHover: 'hover:bg-amber-900',
    accentBorder: 'border-amber-200', accentSoft: 'bg-amber-50',
    heroPanel: 'bg-gradient-to-br from-amber-50 via-yellow-50 to-emerald-50', cardHover: 'hover:border-amber-300',
    certGradient: 'from-amber-800 via-yellow-900 to-emerald-950', imageFallback: '🌴',
  },
];

const REGION_MAP = Object.fromEntries(REGIONS.map((r) => [r.code, r])) as Record<RegionCode, RegionTheme>;

function detectRegion(latitude: number, longitude: number): RegionCode {
  if (latitude >= 18 && latitude <= 54 && longitude >= 73 && longitude <= 135) return 'cn';
  if (latitude >= 18 && latitude <= 72 && longitude >= -170 && longitude <= -50) return 'us';
  if (latitude >= 47 && latitude <= 55.5 && longitude >= 5 && longitude <= 16) return 'de';
  if (latitude >= 24 && latitude <= 46 && longitude >= 122 && longitude <= 146) return 'jp';
  if (latitude >= 41 && latitude <= 52 && longitude >= -5.5 && longitude <= 9.5) return 'fr';
  if (latitude >= 16 && latitude <= 33 && longitude >= 34 && longitude <= 56) return 'sa';
  return DEFAULT_REGION;
}

function detectRegionByCountry(countryCode?: string): RegionCode | null {
  const c = (countryCode || '').toUpperCase();
  if (c === 'CN' || c === 'HK' || c === 'MO' || c === 'TW') return 'cn';
  if (c === 'US') return 'us';
  if (c === 'DE') return 'de';
  if (c === 'JP') return 'jp';
  if (c === 'FR') return 'fr';
  if (c === 'SA') return 'sa';
  return null;
}

function detectRegionByTimezone(): RegionCode {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  if (tz.includes('Shanghai') || tz.includes('Hong_Kong') || tz.includes('Macau') || tz.includes('Taipei')) return 'cn';
  if (tz.startsWith('America/')) return 'us';
  if (tz === 'Europe/Berlin') return 'de';
  if (tz === 'Asia/Tokyo') return 'jp';
  if (tz === 'Europe/Paris') return 'fr';
  if (tz === 'Asia/Riyadh') return 'sa';
  return DEFAULT_REGION;
}

interface RegionContextValue {
  region: RegionTheme;
  setRegionCode: (code: RegionCode) => void;
  locating: boolean;
  locateError: string;
  detectFromBrowser: () => void;
}

const DEFAULT_REGION: RegionCode = process.env.NEXT_PUBLIC_DEFAULT_REGION === 'cn' ? 'cn' : 'us';
const REGION_STORAGE_KEY = `plantHunterRegion:${DEFAULT_REGION}`;

const RegionContext = createContext<RegionContextValue>({
  region: REGION_MAP[DEFAULT_REGION],
  setRegionCode: () => {},
  locating: false,
  locateError: '',
  detectFromBrowser: () => {},
});

export function RegionProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState<RegionCode>(DEFAULT_REGION);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(REGION_STORAGE_KEY) as RegionCode | null;
    if (stored && REGION_MAP[stored]) setCode(stored);
  }, []);

  const setRegionCode = (next: RegionCode) => {
    setCode(next);
    localStorage.setItem(REGION_STORAGE_KEY, next);
    setLocateError('');
  };

  const applyFallbackLocation = async (reasonKey: 'preciseUnavailable' | 'preciseFailed') => {
    try {
      const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
      const data = await res.json();
      const byCountry = detectRegionByCountry(data?.country_code);
      if (byCountry) {
        setRegionCode(byCountry);
        setLocateError(`networkDetected:${byCountry}`);
        return;
      }
    } catch { /* network fallback ignored */ }
    const byTimezone = detectRegionByTimezone();
    setRegionCode(byTimezone);
    setLocateError(`timezoneDetected:${reasonKey}:${byTimezone}`);
  };

  const detectFromBrowser = () => {
    setLocating(true);
    setLocateError('');
    if (!navigator.geolocation || (typeof window !== 'undefined' && !window.isSecureContext)) {
      applyFallbackLocation('preciseUnavailable').finally(() => setLocating(false));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = detectRegion(pos.coords.latitude, pos.coords.longitude);
        setRegionCode(next);
        setLocateError(`currentDetected:${next}`);
        setLocating(false);
      },
      () => {
        applyFallbackLocation('preciseFailed').finally(() => setLocating(false));
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
