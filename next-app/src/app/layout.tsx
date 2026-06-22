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
