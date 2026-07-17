import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { Providers } from './providers';
import SeoTracker from './components/SeoTracker';

// 运行时按 Host header 判定默认语言/区域:
//   horiculture.club / 106.12.91.182 (国内苏州) → zh/cn
//   其它 (horiculture.space / 209.141.34.146 / LA)          → en/us
// SSR 时读 headers(),CF Pages 静态导出回退到 build-time env NEXT_PUBLIC_REGION。
export const dynamic = 'force-dynamic';

async function pickInitialDefaults(): Promise<{ lang: 'zh' | 'en'; region: 'cn' | 'us' }> {
  try {
    const h = await headers();
    const host = (h.get('host') || '').toLowerCase();
    const isCN = host.includes('horiculture.club') || host.includes('106.12.91.182') || host.startsWith('100.96.54.109') || host.startsWith('localhost') || host.startsWith('127.');
    if (host) return isCN ? { lang: 'zh', region: 'cn' } : { lang: 'en', region: 'us' };
  } catch { /* static export: no request headers */ }
  const isGlobal = process.env.NEXT_PUBLIC_REGION === 'global';
  return isGlobal ? { lang: 'en', region: 'us' } : { lang: 'zh', region: 'cn' };
}

export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1 };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://horiculture.space';

// "品"字 icon SVG favicon
const FAVICON_SVG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="#1a1a2e"/><text x="24" y="34" text-anchor="middle" font-size="28" font-weight="bold" fill="#52c41a" font-family="serif">品</text></svg>'
)}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  icons: { icon: FAVICON_SVG },
  title: {
    default: 'Plant Collector · A New Supply Chain Experience',
    template: '%s | Plant Collector',
  },
  description: 'Plant Collector — a smart horticulture supply chain platform for tree auctions, reverse flower auctions, map shopping, garden planting, green certification, and carbon credit trees.',
  keywords: ['植物收藏家', 'Plant Collector', 'flower supply chain', 'horticulture ecommerce', 'garden marketplace', 'wholesale flower auction', 'reverse flower auction', 'map flower shopping', 'green certification', 'carbon credit trees', '花卉供应链', '园艺电商', '苗木批发', '花卉供应链平台'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Plant Collector',
    title: 'Plant Collector · A New Supply Chain Experience',
    description: 'Plant Collector connects origins, merchants, and garden scenarios with a trusted green value chain.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Plant Collector',
    description: 'Plant Collector — horticulture supply chain, auctions, maps, gardens, and green certification.',
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, region } = await pickInitialDefaults();
  return (
    <html lang={lang === 'zh' ? 'zh-CN' : 'en'} data-region={region}>
      <body className="bg-white text-stone-900 min-h-screen antialiased">
        <Providers initialLang={lang} initialRegion={region}>
          <SeoTracker />
          {children}
        </Providers>
      </body>
    </html>
  );
}
