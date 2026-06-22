'use client';

import { useI18n } from '@/lib/i18n/context';

export default function PlantHunterLogo({ size = 'sm', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const { lang } = useI18n();
  const isZh = lang === 'zh';
  const src = isZh ? '/brand/plant-hunter-cn.png' : '/brand/plant-hunter-en.png';
  const sizeClass = size === 'lg' ? 'h-16 w-16' : size === 'md' ? 'h-12 w-12' : 'h-9 w-9';
  return (
    <img
      src={src}
      alt={isZh ? '植物猎人 logo' : 'Plants Hunter logo'}
      className={`${sizeClass} rounded-full object-contain bg-white shadow-sm ring-1 ring-stone-200/70 ${className}`}
    />
  );
}
