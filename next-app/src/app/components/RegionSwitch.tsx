'use client';

import { useEffect, useRef, useState } from 'react';
import { REGIONS, type RegionCode, useRegion } from '@/lib/region-context';
import { useI18n, type Lang } from '@/lib/i18n/context';

export default function RegionSwitch({ className }: { className?: string }) {
  const { region, setRegionCode, locating, locateError, detectFromBrowser } = useRegion();
  const { setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const chooseRegion = (code: RegionCode) => {
    setRegionCode(code);
    const langMap: Record<RegionCode, Lang> = { cn: 'zh', us: 'en', de: 'de' };
    setLang(langMap[code]);
    setOpen(false);
  };

  useEffect(() => {
    const langMap: Record<RegionCode, Lang> = { cn: 'zh', us: 'en', de: 'de' };
    setLang(langMap[region.code]);
  }, [region.code, setLang]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className={`relative inline-block ${className || ''}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium px-2.5 py-1 rounded-full border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50 transition-colors flex items-center gap-1 bg-white/95 shadow-md"
        title="全球位置选择"
        aria-label="全球位置选择"
      >
        <span>🌍</span><span>{region.flag}</span><span>{region.shortLabel}</span><span className="text-[8px] opacity-60">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden min-w-[190px] z-50">
          <div className="px-3 py-2 border-b border-stone-100">
            <p className="text-[10px] text-stone-400 font-semibold tracking-widest uppercase">全球位置</p>
            <button onClick={detectFromBrowser} className="mt-1 w-full text-left text-xs text-emerald-700 hover:text-emerald-900 font-medium">
              {locating ? '正在定位…' : '📍 使用当前位置'}
            </button>
            {locateError && <p className={`text-[10px] mt-1 ${locateError.includes('失败') || locateError.includes('不可用') ? 'text-amber-600' : 'text-emerald-600'}`}>{locateError}</p>}
          </div>
          {REGIONS.map((r) => (
            <button
              key={r.code}
              onClick={() => chooseRegion(r.code as RegionCode)}
              className={`w-full text-left px-3 py-2.5 text-xs flex items-center gap-2 hover:bg-emerald-50 transition-colors ${r.code === region.code ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-stone-700'}`}
            >
              <span className="text-base">{r.flag}</span><span className="flex-1">{r.label}</span>
              {r.recommended && <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">推荐</span>}
              {r.code === region.code && <span className="text-[10px]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
