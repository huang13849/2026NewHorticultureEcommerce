import type { NextConfig } from 'next';

// Cloudflare Pages build env currently provides NEXT_PUBLIC_REGION=global,
// but not always CF_PAGES=1. Treat the global Pages build as static export
// so npm run build regenerates out/ for horiculture.space.
const isCFPages = process.env.CF_PAGES === '1' || process.env.NEXT_PUBLIC_REGION === 'global';

const nextConfig: NextConfig = {
  output: isCFPages ? 'export' : 'standalone',
  images: isCFPages
    ? { unoptimized: true }
    : {
        remotePatterns: [
          {
            protocol: 'http',
            hostname: '100.96.54.109',
            port: '9000',
          },
          {
            protocol: 'https',
            hostname: 'via.placeholder.com',
          },
        ],
      },
};

export default nextConfig;
