import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import GlobalLangSwitch from './components/GlobalLangSwitch';
import SeoTracker from './components/SeoTracker';

export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1 };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://horiculture.space';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '植物猎人 · 供应链新体验 | Plant Hunter',
    template: '%s | 植物猎人 Plant Hunter',
  },
  description: '植物猎人 — 花卉供应链新体验。苗木拍卖、鲜花倒拍、地图购花、花园种植，一站式智能花卉供应链平台。',
  keywords: ['植物猎人', 'Plant Hunter', 'flower supply chain', 'horticulture ecommerce', 'garden marketplace', 'wholesale flower auction', 'reverse flower auction', 'map flower shopping', 'green certification', 'carbon credit trees', '花卉供应链', '园艺电商', '苗木批发', '花卉供应链平台'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: '植物猎人 Plant Hunter',
    title: '植物猎人 · 供应链新体验 | Plant Hunter',
    description: '植物猎人 — 从产地到庭院，智能撮合交易，构建可信绿色价值链。',
  },
  twitter: {
    card: 'summary_large_image',
    title: '植物猎人 Plant Hunter',
    description: '植物猎人 — 花卉供应链新体验：拍卖、地图、花园、绿色认证。',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-stone-900 min-h-screen antialiased">
        <Providers>
          <SeoTracker />
          <GlobalLangSwitch />
          {children}
        </Providers>
      </body>
    </html>
  );
}
