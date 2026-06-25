#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
function read(p){ return fs.readFileSync(path.join(__dirname, '..', p), 'utf8'); }
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); process.exitCode = 1; } else console.log('OK:', msg); }
const page = read('next-app/src/app/success-stories/page.tsx');
const proxy = read('backend/routes/scenes.js');
assert(page.includes("function getInitialRegion()") && page.includes("window.location.hostname.includes('horiculture.space')) return 'global'"), 'horiculture.space defaults to global region');
assert(page.includes("return IS_CN ? 'cn' : 'global'"), 'domestic build defaults to cn region');
assert(!page.includes("(['cn', 'global'] as RegionKey[]).map") && !page.includes('国内版展示') && !page.includes('国际版展示'), 'manual domestic/international switch buttons removed');
assert(page.includes('data-fixed-success-region={region}') && page.includes("fixedRegionNote"), 'page shows fixed-region note instead of switcher');
assert(page.includes("Garden & Landscape · Success Stories"), 'international page title is English');
assert(page.includes("This site always shows the international success stories."), 'international fixed-region note is English');
assert(page.includes("All Success Story Scenes") && page.includes("Search scenes, tags, or titles"), 'international list/search copy is English');
assert(page.includes("sceneTitle(scene, uiRegion)") && page.includes("sceneDesc(scene, uiRegion)") && page.includes("sceneTag(scene, uiRegion)"), 'cards render English managed fields when available');
assert(page.includes("titleEn?: string") && page.includes("descEn?: string") && page.includes("tagEn?: string"), 'frontend supports English managed fields');
assert(proxy.includes('titleEn: s.titleEn') && proxy.includes('descEn: s.descEn') && proxy.includes('tagEn: s.tagEn'), 'backend proxy passes English managed fields through');
assert(proxy.includes("label: '国际版'") && !proxy.includes("label: '国外版'"), 'backend uses 国际版 wording, not 国外版');
assert(page.includes("AuthMenuButton dark loginRedirect=\"/success-stories\""), 'auth menu remains available on success stories page');
if (process.exitCode) process.exit(process.exitCode);
console.log('success stories region/i18n verification passed');
