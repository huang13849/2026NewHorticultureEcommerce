#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(process.cwd(), 'backend/routes/scenes.js'), 'utf8');
function assert(c,m){ if(!c){ console.error('FAIL:',m); process.exitCode=1; } else console.log('OK:',m); }
assert(src.includes('function pickSceneImages'), 'has scene_images-only picker helper');
assert(src.includes('const v = p?.scene_images'), 'scene picker reads scene_images column');
assert(src.includes("fields: 'title,name,flowerName,category,scene_images'"), 'cover endpoint only requests scene_images field');
const coverBlock = src.slice(src.indexOf("router.get('/cover-images'"), src.indexOf("// GET /api/scenes/catalog"));
assert(coverBlock.includes('pickSceneImages(p)'), 'cover endpoint uses scene image picker');
assert(!coverBlock.includes('pickProductImages(p)'), 'cover endpoint does not use mixed product images');
assert(!coverBlock.includes('panorama_images') && !coverBlock.includes('package_images') && !coverBlock.includes('detail_images'), 'cover endpoint does not include non-scene image fields');
if(process.exitCode) process.exit(process.exitCode);
console.log('scene cover image picker verification passed');
