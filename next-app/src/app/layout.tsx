import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1 };

export const metadata: Metadata = {
  title: '京津冀珍稀苗木拍卖中心 | Tree Asset Exchange',
  description: '全球优质树木资产交易平台 — 稀缺·科技·收藏·资产',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#0a0e1a] text-white min-h-screen" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif' }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
