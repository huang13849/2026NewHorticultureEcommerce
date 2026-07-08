import type { Metadata } from 'next';
import { IS_CN } from '@/lib/deploy';
import SeoDashboardClient, { type SeoData } from './SeoDashboardClient';

// server 端一次拉两边数据,client 只做视图切换
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'SEO 管理 | 植物猎人 Plant Hunter',
  description: 'Simple SEO dashboard for traffic, keyword ranking, and next actions.',
  alternates: { canonical: '/seo' },
  robots: { index: false, follow: false },
};

const SEO_API = process.env.NEXT_PUBLIC_SEO_API_URL
  // SSR 环境(k3s 里):seo-service ClusterDNS
  || (typeof window === 'undefined'
      ? (process.env.SEO_SERVICE_URL || 'http://seo-service:3011')
      : (IS_CN ? '/seo-api' : 'http://106.12.91.182/seo-api'));
const FLOWER_API = process.env.NEXT_PUBLIC_API_URL
  || (typeof window === 'undefined'
      ? (process.env.API_GATEWAY_URL || 'http://api-gateway-origin.new-ecommerce.svc.cluster.local:3007')
      : '/api');

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${SEO_API}${path}`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch { return fallback; }
}

async function getFlowerJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${FLOWER_API}${path}`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch { return fallback; }
}

export default async function SeoDashboardPage() {
  // 拉两边数据:analytics 拉两次(默认 host 和显式国内 host=106),trend/audit/cloudflare 一次共用
  const [auditAll, rankingData, analytics, domesticAnalytics, cloudflare, searchLogsResp, trends] = await Promise.all([
    getJson<SeoData['auditAll']>('/api/seo/audit-all', { primary: 'https://horiculture.space', sites: [] }),
    getJson<SeoData['rankingData']>('/api/seo/rankings', { results: [], note: '' }),
    getJson<SeoData['analytics']>('/api/analytics/summary?days=30', { topPages: [], topReferrers: [] }),
    getJson<SeoData['analytics']>('/api/analytics/summary?days=30&host=106.12.91.182', { topPages: [], topReferrers: [] }),
    getJson<SeoData['cloudflare']>('/api/analytics/cloudflare?days=30', { configured: false, error: 'Cloudflare Analytics 暂不可用' }),
    getJson<{ logs: SeoData['searchLogs']; total: number }>('/api/search-logs?limit=200', { logs: [], total: 0 }),
    getJson<SeoData['trends']>('/api/seo/trends', { domestic: [], overseas: [], allKeywords: [] }),
  ]);

  return (
    <SeoDashboardClient
      auditAll={auditAll}
      rankingData={rankingData}
      analytics={analytics}
      domesticAnalytics={domesticAnalytics}
      cloudflare={cloudflare}
      searchLogs={searchLogsResp.logs || []}
      trends={trends}
      defaultRegion={IS_CN ? 'domestic' : 'overseas'}
    />
  );
}
