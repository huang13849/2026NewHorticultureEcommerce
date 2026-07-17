'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import { useEffect, useState } from 'react';

const tabs = [
  { href: '/', labelKey: 'tabbar.collector', emoji: '🌿' },
  { href: '/map', labelKey: 'tabbar.map', emoji: '🗺' },
  { href: '/auction', labelKey: 'tabbar.seedlingAuction', emoji: '🌳' },
  { href: '/reverse-auction', labelKey: 'tabbar.reverseFlowerAuction', emoji: '🌷' },
  { href: '/shop', labelKey: 'tabbar.shop', emoji: '🛒' },
  { href: '/profile', labelKey: 'tabbar.mine', emoji: '👤' },
];

function isCNHost(host: string) {
  return host.includes('horiculture.club') || host.includes('106.12.91.182') || host.startsWith('100.96.54.109') || host.startsWith('localhost') || host.startsWith('127.');
}

// SSR-safe first-frame CN detection via html[data-region] attribute set in layout.tsx
function initialIsCN(): boolean {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-region');
    if (attr === 'cn') return true;
    if (attr === 'intl') return false;
    return isCNHost(window.location.hostname);
  }
  return false;
}

export default function TabBar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [isCN, setIsCN] = useState<boolean>(initialIsCN);
  useEffect(() => {
    setIsCN(isCNHost(window.location.hostname));
  }, []);
  const visibleTabs = isCN ? tabs.filter(tb => tb.href === '/') : tabs;
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-stone-200/60">
      <div className="max-w-6xl mx-auto flex justify-around items-center h-14">
        {visibleTabs.map(tab => {
          const active = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
          return (
            <Link key={tab.href} href={tab.href}
              className={`flex flex-col items-center justify-center px-3 py-1.5 transition-colors ${active ? 'text-emerald-700' : 'text-stone-400 hover:text-stone-600'}`}>
              <span className="text-base leading-none">{tab.emoji}</span>
              <span className="text-[10px] mt-0.5 font-medium">{t(tab.labelKey)}</span>
            </Link>
          );
        })}
      </div>
      {isCN && (
        <div className="max-w-6xl mx-auto flex flex-row items-center justify-center gap-3 py-1.5 border-t border-stone-200/40">
          <a href="https://beian.miit.gov.cn" target="_blank" rel="noreferrer" className="text-[10px] text-stone-500 hover:text-emerald-700 transition-colors inline-flex items-center gap-1">
            <span>🇨🇳</span><span>京ICP备2026007606号-2</span>
          </a>
          <span className="text-stone-300">·</span>
          <a href="https://beian.miit.gov.cn" target="_blank" rel="noreferrer" className="text-[9px] text-stone-400 hover:text-emerald-700 transition-colors">
            信息产业部备案管理系统 · beian.miit.gov.cn ↗
          </a>
        </div>
      )}
    </nav>
  );
}
