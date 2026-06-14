import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1 };

export const metadata: Metadata = {
  title: '智慧供应链 | 花卉新体验',
  description: '京津冀花卉智能供应链平台 — 批发拍卖·鲜花倒拍·地图购花·花园种植',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-white text-stone-900 min-h-screen antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
