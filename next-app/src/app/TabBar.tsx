'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: '首页', emoji: '🏛' },
  { href: '/map', label: '地图', emoji: '🗺' },
  { href: '/auction', label: '苗木拍卖', emoji: '🌳' },
  { href: '/reverse-auction', label: '鲜花倒拍', emoji: '🌷' },
  { href: '/shop', label: '商店', emoji: '🛒' },
  { href: '/garden', label: '花园', emoji: '🌱' },
  { href: '/profile', label: '我的', emoji: '👤' },
];

export default function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-stone-200/60">
      <div className="max-w-6xl mx-auto flex justify-around items-center h-14">
        {tabs.map(t => {
          const active = pathname === t.href || (t.href !== '/' && pathname.startsWith(t.href));
          return (
            <Link key={t.href} href={t.href}
              className={`flex flex-col items-center justify-center px-3 py-1.5 transition-colors ${active ? 'text-emerald-700' : 'text-stone-400 hover:text-stone-600'}`}>
              <span className="text-base leading-none">{t.emoji}</span>
              <span className="text-[10px] mt-0.5 font-medium">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
