'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: '首页', emoji: '🏛' },
  { href: '/map', label: '地图', emoji: '🗺' },
  { href: '/garden', label: '花园', emoji: '🌱' },
  { href: '/profile', label: '我的', emoji: '👤' },
];

export default function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0e1a]/90 backdrop-blur-md border-t border-white/5">
      <div className="max-w-6xl mx-auto flex justify-around items-center h-12">
        {tabs.map(t => (
          <Link key={t.href} href={t.href}
            className={`flex flex-col items-center justify-center px-4 py-1 transition-colors ${pathname === t.href ? 'text-[#c9a84c]' : 'text-[#4b5563] hover:text-[#9ca3af]'}`}>
            <span className="text-base leading-none">{t.emoji}</span>
            <span className="text-[10px] mt-0.5">{t.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
