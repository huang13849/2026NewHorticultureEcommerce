#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pagePath = path.join(root, 'next-app/src/app/success-stories/page.tsx');
const routePath = path.join(root, 'backend/routes/scenes.js');
const homePath = path.join(root, 'next-app/src/app/page.tsx');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('OK:', msg);
  }
}

assert(fs.existsSync(pagePath), 'success-stories page exists');
const page = fs.existsSync(pagePath) ? fs.readFileSync(pagePath, 'utf8') : '';
const route = fs.existsSync(routePath) ? fs.readFileSync(routePath, 'utf8') : '';
const home = fs.existsSync(homePath) ? fs.readFileSync(homePath, 'utf8') : '';

assert(page.includes('庭院园林 · 成功案例'), 'page title is present');
assert(page.includes('所有场景'), 'page uses unified all-scenes copy');
assert(!page.includes('SEO趋势词场景') && !page.includes('商品标签场景'), 'page removes separate SEO/product scene section labels');
assert(page.includes('const allScenes') && page.includes('seoTrends'), 'page flattens product-tag and SEO trend scenes into allScenes');
assert(page.includes('useAuth') && page.includes('isAdmin'), 'page reads auth/admin state');
assert(page.includes('{isAdmin &&') || page.includes('isAdmin ?'), 'page gates edit controls by admin');
assert(page.includes('Authorization') && page.includes('Bearer'), 'page sends auth token when saving scene changes');
assert(page.includes('选择商品库图片') && page.includes('coverImageUrl'), 'admin path can choose product-library image as cover');
assert(page.includes('普通用户仅可浏览') || page.includes('管理员登录后'), 'page explains visitor/admin permission state');

assert(route.includes("router.get('/catalog'") || route.includes('router.get("/catalog"'), 'backend exposes /api/scenes/catalog');
assert(route.includes('authOptional') || route.includes('requireSceneAdmin'), 'backend has scene admin auth helpers');
assert(route.includes('requireSceneAdmin'), 'backend protects scene mutation endpoints');
assert(/router\.post\('\/'\s*,\s*requireSceneAdmin/.test(route) || /router\.post\("\/"\s*,\s*requireSceneAdmin/.test(route), 'backend protects create scene');
assert(/router\.put\('\/:id'\s*,\s*requireSceneAdmin/.test(route) || /router\.put\("\/:id"\s*,\s*requireSceneAdmin/.test(route), 'backend protects update scene/cover');
assert(/router\.delete\('\/:id'\s*,\s*requireSceneAdmin/.test(route) || /router\.delete\("\/:id"\s*,\s*requireSceneAdmin/.test(route), 'backend protects delete scene');
assert(route.includes('getProductTags') && route.includes('getSeoTrends'), 'backend catalog combines product tags and SEO trends');

assert(home.includes('limit=5') || home.includes('slice(0, 5)'), 'home loads/displays only 5 featured success stories');
assert(home.includes('carouselIndex') && home.includes('onTouchStart') && home.includes('onTouchEnd'), 'home has carousel state and mobile swipe handlers');
assert(home.includes('aria-label="上一个成功案例"') && home.includes('aria-label="下一个成功案例"'), 'home has PC arrow controls');
assert(home.includes('查看更多') && home.includes('/success-stories'), 'home has prominent more button to standalone page');
assert(home.includes('IS_CN ?') && home.includes('horiculture.space/success-stories'), 'home uses region-aware more link for cn/global nodes');
assert(home.includes('successStories.slice(0, 5)'), 'home carousel uses top five scenes');

if (process.exitCode) process.exit(process.exitCode);
console.log('success-stories verification passed');
