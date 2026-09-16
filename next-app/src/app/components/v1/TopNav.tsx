'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/market',  label: '今日花价' },
  { href: '/shop',    label: '鲜花' },
  { href: '/garden',  label: '绿植' },
  { href: '/ai-select', label: 'AI选花' },
];

export default function TopNav() {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState(false);
  const [city, setCity] = useState('北京');
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-stone-200/70">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-600 to-emerald-800 text-white text-sm font-black">品</span>
          <span className="font-semibold tracking-tight text-stone-900 text-base group-hover:text-emerald-800 transition-colors">北京鲜花</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => {
            const active = pathname === l.href || (l.href !== '/' && pathname?.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${active ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpenMenu(!openMenu)}
            className="hidden sm:inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900"
          >
            <span className="inline-block w-3.5 h-3.5 rounded-full bg-emerald-600/15 ring-1 ring-emerald-700/40" />
            <span>{city}</span>
            <svg width="10" height="10" viewBox="0 0 12 12" className="opacity-60"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
          </button>
          <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>
            <span className="hidden sm:inline">我的</span>
          </Link>
          <button className="md:hidden p-1.5" onClick={() => setOpenMenu(!openMenu)} aria-label="菜单">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
        </div>
      </div>
      {openMenu && (
        <div className="md:hidden border-t border-stone-200/70 bg-white">
          <nav className="max-w-6xl mx-auto px-6 py-3 flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpenMenu(false)}
                className={`py-2 px-3 rounded-lg text-sm ${pathname === l.href ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'}`}
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={() => { setCity(city === '北京' ? '上海' : '北京'); setOpenMenu(false); }}
              className="text-left py-2 px-3 rounded-lg text-sm text-stone-700 hover:bg-stone-100"
            >
              切换城市: 当前 {city}
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
