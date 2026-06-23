'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import { IS_CN } from '@/lib/deploy';

const tabs = [
  { href: '/', labelKey: 'tabbar.collector', emoji: '🌿' },
  { href: '/map', labelKey: 'tabbar.map', emoji: '🗺' },
  { href: '/auction', labelKey: 'tabbar.seedlingAuction', emoji: '🌳' },
  { href: '/reverse-auction', labelKey: 'tabbar.reverseFlowerAuction', emoji: '🌷' },
  { href: '/shop', labelKey: 'tabbar.shop', emoji: '🛒' },
  { href: '/profile', labelKey: 'tabbar.mine', emoji: '👤' },
];

// 国内版(备案合规): 仅保留â收藏家â主页, 隐藏其余入口
const visibleTabs = IS_CN ? tabs.filter(t => t.href === '/') : tabs;

export default function TabBar() {
  const pathname = usePathname();
  const { t } = useI18n();
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
    </nav>
  );
}
