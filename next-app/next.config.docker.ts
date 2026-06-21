import type { NextConfig } from 'next';

const isCFPages = process.env.CF_PAGES === '1';

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
