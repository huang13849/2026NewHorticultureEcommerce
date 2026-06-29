import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '地图 · 花伴',
  icons: {
    icon: [
      { url: '/map-icon.svg?v=2026062901', type: 'image/svg+xml' },
    ],
    shortcut: ['/map-icon.svg?v=2026062901'],
    apple: [{ url: '/map-icon.svg?v=2026062901', type: 'image/svg+xml' }],
  },
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
