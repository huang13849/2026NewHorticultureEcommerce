import type { NextConfig } from 'next';

// Cloudflare Pages build env currently provides NEXT_PUBLIC_REGION=global,
// but not always CF_PAGES=1. Treat the global Pages build as static export
// so npm run build regenerates out/ for horiculture.space.
const isCFPages = process.env.CF_PAGES === '1' || process.env.NEXT_PUBLIC_REGION === 'global';

// k3s / Docker (server-side) 部署时，需要把前端里同源发出的 /api/mongo/* 和
// /supplier-map/*、/dealer-map/* 反代到集群内对应服务。CF Pages 静态导出没有 server，
// 直接跳过 rewrites（那边由外层 nginx / CF Workers 处理路由）。
const API_GATEWAY_URL =
  process.env.API_GATEWAY_URL || 'http://api-gateway-origin.new-ecommerce.svc.cluster.local:3007';
const SUPPLIER_MAP_URL =
  process.env.SUPPLIER_MAP_URL || 'http://supplier-map.new-ecommerce.svc.cluster.local:80';
const DEALER_MAP_URL =
  process.env.DEALER_MAP_URL || 'http://dealer-map.new-ecommerce.svc.cluster.local:80';
const SEO_SERVICE_URL =
  process.env.SEO_SERVICE_URL || 'http://seo-service.new-ecommerce.svc.cluster.local:3011';
const FLOWER_API_URL =
  process.env.FLOWER_API_URL || 'http://flower-api.new-ecommerce.svc.cluster.local:3010';

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
  ...(isCFPages
    ? {}
    : {
        async rewrites() {
          // 使用 {beforeFiles, afterFiles, fallback} 三段式，因为 default (afterFiles)
          // 在 dynamic filesystem routes 之前触发，会截胡 /api/auth/[...nextauth]。
          // - beforeFiles: 精确的第三方微服务路径 (SEO/mongo/map)
          // - afterFiles : 空
          // - fallback   : 通配 /api/:path* → flower-api，只在 next.js 找不到对应 route 时才生效，
          //                所以 NextAuth 的 /api/auth/[...nextauth] 会走本地 handler。
          return {
            beforeFiles: [
              { source: '/supplier-map/:path*', destination: `${SUPPLIER_MAP_URL}/:path*` },
              { source: '/dealer-map/:path*', destination: `${DEALER_MAP_URL}/:path*` },
              { source: '/api/mongo/:path*', destination: `${API_GATEWAY_URL}/api/mongo/:path*` },
              { source: '/api/seo/:path*', destination: `${SEO_SERVICE_URL}/api/seo/:path*` },
              { source: '/api/analytics/:path*', destination: `${SEO_SERVICE_URL}/api/analytics/:path*` },
              // flower-api auth endpoints must NOT hit the NextAuth [...nextauth] catch-all.
              // These read the .horiculture.club/.horiculture.space cookies for cross-site SSO.
              { source: '/api/auth/me-flower', destination: `${FLOWER_API_URL}/api/auth/me-flower` },
              { source: '/api/auth/cross-issue', destination: `${FLOWER_API_URL}/api/auth/cross-issue` },
              { source: '/api/auth/cross-consume', destination: `${FLOWER_API_URL}/api/auth/cross-consume` },
              { source: '/api/auth/logout-flower', destination: `${FLOWER_API_URL}/api/auth/logout-flower` },
              { source: '/api/auth/sso-callback', destination: `${FLOWER_API_URL}/api/auth/sso-callback` },
            ],
            afterFiles: [],
            fallback: [
              // 其余 /api/* 走 flower-api (payment, products, wechat-pay, ...)
              // NextAuth 的 /api/auth/[...nextauth] 是 filesystem route，会先命中，不会走这里。
              { source: '/api/:path*', destination: `${FLOWER_API_URL}/api/:path*` },
            ],
          };
        },
      }),
};

export default nextConfig;
