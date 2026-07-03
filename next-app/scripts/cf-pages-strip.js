// scripts/cf-pages-strip.js
// CF Pages 全球静态导出时,把无法静态化的路由从 build 输入中剔除。
// k3s / docker / local dev 时无副作用(NEXT_PUBLIC_REGION 不为 'global')。
const fs = require('fs');
const path = require('path');

const isGlobal = process.env.NEXT_PUBLIC_REGION === 'global' || process.env.CF_PAGES === '1';
if (!isGlobal) {
  process.exit(0);
}

const ROUTES_TO_STRIP = [
  'src/app/seo',   // 使用 force-dynamic,依赖运行时 fetch,只在 k3s 有意义
];

for (const rel of ROUTES_TO_STRIP) {
  const abs = path.resolve(__dirname, '..', rel);
  if (fs.existsSync(abs)) {
    fs.rmSync(abs, { recursive: true, force: true });
    console.log(`[cf-pages-strip] removed ${rel}`);
  }
}
