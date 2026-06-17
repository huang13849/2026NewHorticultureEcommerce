'use client';

import { useState, useRef, useEffect } from 'react';
import { useI18n, LANGS, type Lang } from '@/lib/i18n/context';

export default function LangSwitch({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const current = LANGS.find((l) => l.code === lang) || LANGS[0];

  return (
    <div ref={ref} className={`relative inline-block ${className || ''}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium px-2.5 py-1 rounded-full border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50 transition-colors flex items-center gap-1"
        title="Language"
        aria-label="Language switcher"
      >
        <span>🌐</span>
        <span>{current.label}</span>
        <span className="text-[8px] opacity-60">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden min-w-[120px] z-50">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code as Lang);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-emerald-50 transition-colors ${
                l.code === lang ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-stone-700'
              }`}
            >
              <span>{l.native}</span>
              <span className="text-[10px] opacity-60">{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
