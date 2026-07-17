'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import { useRegion } from '@/lib/region-context';

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
  const { region } = useRegion();
  const isCN = region.code === 'cn';
  // CN 版：底部一条极薄的备案栏 + 右下角"收藏家"浮标
  if (isCN) {
    const collectorActive = pathname === '/';
    return (
      <>
        {/* 右下浮标：收藏家入口 */}
        <Link
          href="/"
          aria-label={t('tabbar.collector')}
          className={`fixed bottom-14 right-4 z-50 flex items-center gap-1.5 rounded-full shadow-lg border transition-all
            ${collectorActive
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30'
              : 'bg-white/95 text-emerald-700 border-emerald-100 hover:bg-emerald-50'}
            backdrop-blur px-3.5 py-2`}
        >
          <span className="text-base leading-none">🌿</span>
          <span className="text-[11px] font-medium leading-none">{t('tabbar.collector')}</span>
        </Link>
        {/* 底部极薄备案栏：左右排列 */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/85 backdrop-blur-xl border-t border-stone-200/60">
          <div className="max-w-6xl mx-auto flex flex-row items-center justify-center gap-2 py-1.5 px-3">
            <a href="https://beian.miit.gov.cn" target="_blank" rel="noreferrer" className="text-[10px] text-stone-500 hover:text-emerald-700 transition-colors inline-flex items-center gap-1">
              <span>🇨🇳</span><span>京ICP备2026007606号-2</span>
            </a>
            <span className="text-stone-300 text-[10px]">·</span>
            <a href="https://beian.miit.gov.cn" target="_blank" rel="noreferrer" className="text-[10px] text-stone-500 hover:text-emerald-700 transition-colors">
              信息产业部备案管理系统 ↗
            </a>
          </div>
        </nav>
      </>
    );
  }
  // 非 CN：保留完整 TabBar
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
