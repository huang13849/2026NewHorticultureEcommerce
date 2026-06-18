import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import GlobalLangSwitch from './components/GlobalLangSwitch';
import SeoTracker from './components/SeoTracker';

export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1 };

export const metadata: Metadata = {
  metadataBase: new URL('https://2026newhorticultureecommerce.pages.dev'),
  title: {
    default: 'Smart Flower Supply Chain | Horticulture Ecommerce & Garden Marketplace',
    template: '%s | Smart Flower Supply Chain',
  },
  description: 'Smart flower and horticulture ecommerce platform for wholesale flower auctions, reverse auctions, map-based garden shopping, green tree certification and carbon credit services.',
  keywords: ['flower supply chain', 'horticulture ecommerce', 'garden marketplace', 'wholesale flower auction', 'reverse flower auction', 'map flower shopping', 'green certification', 'carbon credit trees', '花卉供应链', '园艺电商', '苗木批发'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: 'https://2026newhorticultureecommerce.pages.dev',
    siteName: 'Smart Flower Supply Chain',
    title: 'Smart Flower Supply Chain | Horticulture Ecommerce & Garden Marketplace',
    description: 'Connect flower origins, suppliers and buyers with auctions, map shopping, garden planting and green certification.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Smart Flower Supply Chain',
    description: 'Horticulture ecommerce, wholesale auctions, map shopping and green certification.',
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
