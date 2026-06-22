'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';

const tabs = [
  { href: '/', labelKey: 'tabbar.collector', emoji: '🌿' },
  { href: '/map', labelKey: 'tabbar.map', emoji: '🗺' },
  { href: '/auction', labelKey: 'tabbar.seedlingAuction', emoji: '🌳' },
  { href: '/reverse-auction', labelKey: 'tabbar.reverseFlowerAuction', emoji: '🌷' },
  { href: '/shop', labelKey: 'tabbar.shop', emoji: '🛒' },
  { href: '/profile', labelKey: 'tabbar.mine', emoji: '👤' },
];

export default function TabBar() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-stone-200/60">
      <div className="max-w-6xl mx-auto flex justify-around items-center h-14">
        {tabs.map(tab => {
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
