// scripts/cf-pages-strip.js
// CF Pages 全球静态导出时,把无法静态化的路由从 build 输入中剔除。
// 判定: CF_PAGES=1 (CF 官方常见) 或 NEXT_PUBLIC_REGION=global,
// 但 LA docker build 通过 LA_STANDALONE_BUILD=1 opt-out (它也走 global 但是 SSR)。
// k3s / docker / local dev 时无副作用。
const fs = require('fs');
const path = require('path');

const isGlobal =
  process.env.CF_PAGES === '1' || process.env.NEXT_PUBLIC_REGION === 'global';
const isLAStandalone = process.env.LA_STANDALONE_BUILD === '1';
if (!isGlobal || isLAStandalone) {
  process.exit(0);
}

const ROUTES_TO_STRIP = [
  'src/app/seo',                        // force-dynamic + 运行时 fetch, CF 静态导出不支持
  'src/app/api/auth',
  'src/app/api/peony-alliance',                   // NextAuth v5 + SSO 运行时路由 (force-dynamic), CF 静态导出不支持
  'src/app/login/sso',
  'src/app/purchase-order',     // 订单详情 force-dynamic (DB), CF 静态导出不支持                  // 服务端 fetchCsrf → NextAuth (force-dynamic), CF 静态导出不支持
  'src/app/orders',         // useSearchParams needs Suspense, CF 静态导出不支持
  'src/app/cart',           // 购物车 useSearchParams, CF 静态导出不支持
  'src/app/payment',        // 支付流程 force-dynamic, CF 静态导出不支持
  'src/app/profile',        // 个人中心需要 auth, CF 静态导出不支持
  'src/app/admin',          // 管理后台需要 auth, CF 静态导出不支持
  'src/app/register',       // 注册流程需要 NextAuth, CF 静态导出不支持
  'src/app/login',          // 登录流程需要 NextAuth, CF 静态导出不支持
  'src/app/garden',         // 种花 force-dynamic, CF 静态导出不支持
  'src/app/auction',        // 拍卖 force-dynamic, CF 静态导出不支持
  'src/app/reverse-auction',// 反向拍卖 force-dynamic, CF 静态导出不支持
  'src/app/peony-alliance', // 牡丹联盟 force-dynamic, CF 静态导出不支持
  'src/app/supplier-videos',// 供应商视频 force-dynamic, CF 静态导出不支持
  'src/app/success-stories',// 成功案例 force-dynamic, CF 静态导出不支持
  'src/app/shop',           // 商品列表 useSearchParams, CF 静态导出不支持
];

for (const rel of ROUTES_TO_STRIP) {
  const abs = path.resolve(__dirname, '..', rel);
  if (fs.existsSync(abs)) {
    fs.rmSync(abs, { recursive: true, force: true });
    console.log(`[cf-pages-strip] removed ${rel}`);
  }
}
