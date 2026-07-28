/**
 * SSR i18n helper: 服务端根据 Host header 选择语言字典
 * 与 src/app/layout.tsx 的 pickInitialDefaults 保持一致
 * 供 /login、/register 等 server components 使用
 */
import { headers } from 'next/headers';
import zh from './zh.json';
import en from './en.json';
import de from './de.json';
import ja from './ja.json';
import fr from './fr.json';
import ar from './ar.json';
import ru from './ru.json';

export type Lang = 'zh' | 'en' | 'de' | 'ja' | 'fr' | 'ar' | 'ru';

const DICTS: Record<Lang, Record<string, unknown>> = { zh, en, de, ja, fr, ar, ru };

export async function pickServerLang(): Promise<Lang> {
  try {
    const h = await headers();
    // 1. Prefer explicit lang cookie set by client-side i18n switch
    const cookie = h.get('cookie') || '';
    const m = cookie.match(/(?:^|;\s*)lang=([a-z]{2})/i);
    if (m && (['zh','en','de','ja','fr','ar','ru'] as const).includes(m[1] as Lang)) {
      return m[1] as Lang;
    }
    // 2. Fallback: host-based (matches layout.tsx pickInitialDefaults)
    const host = (h.get('host') || '').toLowerCase();
    const isCN = host.includes('horiculture.club') || host.includes('106.12.91.182')
      || host.startsWith('100.96.54.109') || host.startsWith('localhost') || host.startsWith('127.');
    return isCN ? 'zh' : 'en';
  } catch {
    return process.env.NEXT_PUBLIC_REGION === 'global' ? 'en' : 'zh';
  }
}

function resolve(obj: unknown, key: string): string | undefined {
  const parts = key.split('.');
  let val: unknown = obj;
  for (const p of parts) {
    if (val && typeof val === 'object') val = (val as Record<string, unknown>)[p];
    else return undefined;
    if (val === undefined) return undefined;
  }
  return typeof val === 'string' ? val : undefined;
}

export function serverT(lang: Lang) {
  return (key: string, params?: Record<string, string | number>): string => {
    const val = resolve(DICTS[lang], key)
      ?? resolve(DICTS.en, key)
      ?? resolve(DICTS.zh, key);
    if (val === undefined || val === null) return key;
    if (!params) return val;
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      val
    );
  };
}
