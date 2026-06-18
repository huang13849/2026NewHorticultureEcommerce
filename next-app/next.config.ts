import type { NextConfig } from 'next';

const isCloudflarePages = process.env.CF_PAGES === '1';

const nextConfig: NextConfig = {
  output: isCloudflarePages ? 'export' : 'standalone',
  images: {
    unoptimized: isCloudflarePages,
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
