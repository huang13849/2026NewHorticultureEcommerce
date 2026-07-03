// Migration: 给 super_admin 用户设置 mongo passwordHash（跨境 SSO 基线）
const bcrypt = require('bcryptjs');
const db = require('./lib/db');

async function main() {
  const PHONE = process.argv[2] || '18511987921';
  const PASSWORD = process.argv[3] || '123456';
  console.log(`[migrate] phone=${PHONE}`);
  const hash = bcrypt.hashSync(PASSWORD, 10);
  const users = await db.find('users', { filter: { phone: PHONE } });
  let user = users[0];
  if (!user) {
    console.log('[migrate] user not found, creating...');
    user = await db.create('users', {
      username: PHONE,
      phone: PHONE,
      nickname: '超级管理员',
      avatar: '👑',
      role: 'super_admin',
      passwordHash: hash,
      location: { type: 'Point', coordinates: [0, 0] },
      locationAddress: '',
      address: [],
      preferences: { categories: [], priceRange: {}, favoriteSuppliers: [] },
      gardenStats: { totalPlanted: 0, totalCompleted: 0, totalGifted: 0 },
      createdAt: new Date(),
    });
    console.log('[migrate] created user:', user._id);
  } else {
    console.log('[migrate] updating user:', user._id);
    await db.update('users', user._id, {
      role: 'super_admin',
      nickname: '超级管理员',
      avatar: '👑',
      passwordHash: hash,
    });
    console.log('[migrate] updated ok');
  }
  // 校验
  const check = await db.find('users', { filter: { phone: PHONE } });
  console.log('[verify] passwordHash present:', !!check[0]?.passwordHash, 'role:', check[0]?.role);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
