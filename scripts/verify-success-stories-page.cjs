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
assert(page.includes('庭院园林 · 成功案例'), 'page title is present');
assert(page.includes('商品标签场景') && page.includes('SEO趋势词场景'), 'page has product-tag and SEO-trend sections');
assert(page.includes("'cn'") && page.includes("'global'"), 'page supports domestic/global region switching');
assert(page.includes('FormData') && page.includes('type="file"'), 'page can upload/replace cover image');
assert(page.includes('/scenes/catalog'), 'page loads scene catalog endpoint');
assert(page.includes('saveCover') || page.includes('handleCover'), 'page has cover save handler');

const route = fs.existsSync(routePath) ? fs.readFileSync(routePath, 'utf8') : '';
assert(route.includes("router.get('/catalog'") || route.includes('router.get("/catalog"'), 'backend exposes /api/scenes/catalog');
assert(route.includes("router.post('/'") || route.includes('router.post("/"'), 'backend proxies create scene');
assert(route.includes("router.put('/:id'") || route.includes('router.put("/:id"'), 'backend proxies update scene/cover');
assert(route.includes("router.delete('/:id'") || route.includes('router.delete("/:id"'), 'backend proxies delete scene');
assert(route.includes('getProductTags') && route.includes('getSeoTrends'), 'backend catalog combines product tags and SEO trends');

const home = fs.existsSync(homePath) ? fs.readFileSync(homePath, 'utf8') : '';
assert(home.includes('/success-stories'), 'home page links to standalone success-stories page');

if (process.exitCode) process.exit(process.exitCode);
console.log('success-stories verification passed');
