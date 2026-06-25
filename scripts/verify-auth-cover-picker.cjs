#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exitCode=1; } else console.log('OK:',msg); }

const home = read('next-app/src/app/page.tsx');
const page = read('next-app/src/app/success-stories/page.tsx');
const route = read('backend/routes/scenes.js');
const authButtonPath = path.join(root, 'next-app/src/app/components/AuthMenuButton.tsx');
const authButton = fs.existsSync(authButtonPath) ? fs.readFileSync(authButtonPath, 'utf8') : '';

assert(fs.existsSync(authButtonPath), 'shared AuthMenuButton component exists');
assert(authButton.includes('useAuth') && authButton.includes('logout') && authButton.includes('/profile') && authButton.includes('/login'), 'auth menu supports login/logout/profile');
assert(authButton.includes('登录') && authButton.includes('退出登录') && authButton.includes('个人中心'), 'auth menu has unified user-facing actions');
assert(home.includes('AuthMenuButton') && page.includes('AuthMenuButton'), 'home and success-stories use shared auth menu');

assert(route.includes("router.get('/cover-images'") || route.includes('router.get("/cover-images"'), 'backend exposes product-library cover image endpoint');
assert(route.includes('coverImageUrl') && route.includes('pickProductImages'), 'backend accepts coverImageUrl and can list product images');
assert(page.includes('coverOptions') && page.includes('选择商品库图片'), 'success page offers product-library image picker');
assert(page.includes('saveCoverFromLibrary') && page.includes('coverImageUrl'), 'success page saves selected product-library image as cover');
assert(page.includes('/scenes/cover-images'), 'success page loads cover image options from backend');
assert(!page.includes('type="file"'), 'success page no longer relies on file upload for cover selection');

assert(!home.includes('{s.tag}</span>') && !home.includes('bottom-4 left-4 right-4 line-clamp-1 rounded-full'), 'home success images do not show category/tag overlay');
assert(home.includes('object-cover'), 'home success images still render normally');

if (process.exitCode) process.exit(process.exitCode);
console.log('auth-cover-picker verification passed');
