import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import GlobalLangSwitch from './components/GlobalLangSwitch';
import SeoTracker from './components/SeoTracker';
import ZitadelAuthBar from './components/ZitadelAuthBar';

// 按 hostname 选默认语言/区域: horiculture.club → zh/cn, 其它(含 space) → en/us
// 静态导出 (CF Pages) 时没有 request headers,靠 build-time env 决定默认区域。
// 客户端 GlobalLangSwitch 会按 window.location.hostname + localStorage 调整实际显示。
function pickInitialDefaults(): { lang: 'zh' | 'en'; region: 'cn' | 'us' } {
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, region } = pickInitialDefaults();
  return (
    <html lang={lang === 'zh' ? 'zh-CN' : 'en'}>
      <body className="bg-white text-stone-900 min-h-screen antialiased">
        <Providers initialLang={lang} initialRegion={region}>
          <SeoTracker />
          <GlobalLangSwitch />
          <div className="fixed right-3 top-3 z-50">
            <ZitadelAuthBar />
          </div>
          {children}
        </Providers>
      </body>
    </html>
  );
}
