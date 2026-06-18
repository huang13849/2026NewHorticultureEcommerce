import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import GlobalLangSwitch from './components/GlobalLangSwitch';

export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1 };

export const metadata: Metadata = {
  title: 'Smart Supply Chain | A New Flower Experience',
  description: 'An intelligent flower supply chain platform for wholesale auctions, reverse flower auctions, map shopping, and garden planting.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-stone-900 min-h-screen antialiased">
        <Providers>
          <GlobalLangSwitch />
          {children}
        </Providers>
      </body>
    </html>
  );
}
