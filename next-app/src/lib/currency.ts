/**
 * 货币显示统一逻辑
 * - 商品价格 DB 存的都是 CNY (人民币元)
 * - 显示时根据用户 region 走 Intl.NumberFormat + 汇率
 */

import type { RegionCode } from './region-context';

export type CurrencyCode = 'CNY' | 'USD' | 'EUR' | 'JPY' | 'SAR';

export const REGION_CURRENCY: Record<RegionCode, CurrencyCode> = {
  cn: 'CNY',
  us: 'USD',
  de: 'EUR',
  jp: 'JPY',
  fr: 'EUR',
  sa: 'SAR',
};

/** 基础汇率 (CNY -> X) — 后端 /currency/rates?base=CNY 会覆盖 */
export const FALLBACK_RATES: Record<CurrencyCode, number> = {
  CNY: 1,
  USD: 0.138,
  EUR: 0.128,
  JPY: 21.8,
  SAR: 0.518,
};

export const CURRENCY_LOCALE: Record<CurrencyCode, string> = {
  CNY: 'zh-CN',
  USD: 'en-US',
  EUR: 'de-DE',
  JPY: 'ja-JP',
  SAR: 'ar-SA',
};

/**
 * 主 API：把 CNY 数值格式化为 region 对应的货币展示串
 * 例：formatPrice(100, 'us') -> "$13.80"
 *     formatPrice(100, 'cn') -> "¥100.00"
 *     formatPrice(undefined, 'us') -> "$--"
 */
export function formatPrice(
  cnyAmount: number | undefined,
  regionCode?: RegionCode,
  rate?: number
): string {
  // SSR / 无 region 时: 从 localStorage 兜底读取
  const code: RegionCode = regionCode || detectRegionFromStorage();
  const currency = REGION_CURRENCY[code] || 'CNY';
  const useRate = rate ?? FALLBACK_RATES[currency];

  if (cnyAmount == null || isNaN(cnyAmount)) {
    // 保持货币符号但用 -- 占位
    const symbol = currencySymbol(currency);
    return `${symbol}--`;
  }

  const amount = cnyAmount * useRate;
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(amount);
  } catch {
    // Intl 不支持时兜底
    return `${currencySymbol(currency)}${amount.toFixed(currency === 'JPY' ? 0 : 2)}`;
  }
}

function currencySymbol(c: CurrencyCode): string {
  switch (c) {
    case 'CNY': return '¥';
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'JPY': return '¥';
    case 'SAR': return 'ر.س ';
    default: return '';
  }
}

/**
 * SSR / hook 外场景使用: 读 localStorage 里 plantHunterRegion:{cn|us}
 * 命中失败时 fallback 到 NEXT_PUBLIC_DEFAULT_REGION 或 'us'
 */
function detectRegionFromStorage(): RegionCode {
  if (typeof window === 'undefined') {
    return ((process.env.NEXT_PUBLIC_DEFAULT_REGION as RegionCode) || 'us');
  }
  const defaultRegion = (process.env.NEXT_PUBLIC_DEFAULT_REGION as RegionCode) || 'us';
  // 两个域名共享 key 前缀 plantHunterRegion:*
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('plantHunterRegion:')) {
      const v = localStorage.getItem(key) as RegionCode | null;
      if (v && v in REGION_CURRENCY) return v;
    }
  }
  return defaultRegion;
}

/** 拉后端最新汇率 (CNY 基准), 失败返回 FALLBACK_RATES */
export async function fetchRates(): Promise<Record<CurrencyCode, number>> {
  const API = process.env.NEXT_PUBLIC_API_URL || '/api';
  try {
    const res = await fetch(`${API}/currency/rates?base=CNY`, { cache: 'no-store' });
    if (!res.ok) return FALLBACK_RATES;
    const data = await res.json();
    return { ...FALLBACK_RATES, ...(data.rates || {}) };
  } catch {
    return FALLBACK_RATES;
  }
}
