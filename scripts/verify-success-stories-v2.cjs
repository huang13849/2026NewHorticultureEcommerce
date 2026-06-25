#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const homePath = path.join(root, 'next-app/src/app/page.tsx');
const pagePath = path.join(root, 'next-app/src/app/success-stories/page.tsx');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('OK:', msg);
  }
}

const home = fs.readFileSync(homePath, 'utf8');
const page = fs.readFileSync(pagePath, 'utf8');

// 1. 首页5个精选案例：桌面展示3个，可左右切换另外2个，默认慢速自动轮播
assert(home.includes('visibleStoryCount') && home.includes('3'), 'home defines 3 visible success-story cards on desktop');
assert(home.includes('maxStoryIndex') && home.includes('Math.max(successStories.length - visibleStoryCount'), 'home limits carousel to reveal remaining two cards');
assert(home.includes('setInterval') && home.includes('goStory(1)'), 'home auto slides success stories by default');
assert(home.includes('duration-700') || home.includes('duration-[700ms]') || home.includes('transition-transform duration'), 'home uses a slow/smooth carousel transition');

// 2. 5个精选案例图片固定大小
assert(home.includes('h-52') && home.includes('aspect-') || home.includes('h-[220px]'), 'home success-story cards use fixed image height/aspect');
assert(home.includes('object-cover'), 'home success-story images use object-cover');

// 3. 只保留一个查看更多按钮
const moreCount = (home.match(/查看更多/g) || []).length;
assert(moreCount === 1, `home has exactly one 查看更多 button/copy, got ${moreCount}`);
assert(!home.includes('查看更多完整案例'), 'home removes secondary 查看更多完整案例 button');

// 4. 国际页默认国际版，文案使用国际版，不再使用国外版
assert(page.includes('function getInitialRegion') && page.includes('horiculture.space') && page.includes("return 'global'"), 'success page detects horiculture.space and defaults to global');
assert(page.includes('国际版') && !page.includes('国外版'), 'success page labels global as 国际版, not 国外版');
assert(page.includes('国际版展示') && !page.includes('国外版展示'), 'success page tab uses 国际版展示');

// 5. 右上角登录状态和管理员登录入口
assert(page.includes('loginUrl') && page.includes('/login?redirect=') && page.includes("encodeURIComponent('/success-stories')"), 'success page has login URL for returning to current page');
assert(page.includes('18511987921') && page.includes('管理员登录'), 'success page shows admin phone login hint/entry when logged out');
assert(page.includes('user.phone') && page.includes('logout'), 'success page shows logged-in status and logout action');
assert(page.includes('修改封面') && page.includes('isAdmin'), 'admin can modify covers after login');

if (process.exitCode) process.exit(process.exitCode);
console.log('success-stories v2 verification passed');
