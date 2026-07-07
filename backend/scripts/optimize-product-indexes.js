/**
 * MongoDB 索引优化脚本（一次性）
 * 用途：为 /shop 商品列表 & 搜索页优化查询性能
 *
 * 现有索引（截至本改动前）：
 *   - title_1
 *   - category_1
 *   - title_text_description_text_flowerName_text  ← 全文索引（已存在）
 *   - createdAt_-1
 *   - salesCount 无索引 ← 默认排序（recommend）走它，会 in-memory sort
 *
 * 本次新增：
 *   - { status: 1, stock: 1, salesCount: -1, createdAt: -1 }
 *       给 /shop 默认列表 "status!=deleted AND stock>0 SORT salesCount desc, createdAt desc" 一个完整覆盖索引
 *   - { category: 1, salesCount: -1 }
 *       分类页排序（点分类 filter 后按销量排）
 *
 * 用法：在 API Gateway pod 里跑
 *   kubectl -n supply-chain exec deploy/api-gateway -- \
 *     node /app/scripts/optimize-product-indexes.js
 *
 * 或本地：MONGO_URI=... node backend/scripts/optimize-product-indexes.js
 */
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI
  || 'mongodb://admin:Hy%401987921@100.67.126.90:27017/supply_chain?authSource=admin&replicaSet=rs0&readPreference=secondaryPreferred';

async function main() {
  console.log('[optimize-indexes] connecting…');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;
  const col = db.collection('products');

  const before = await col.indexes();
  console.log('[optimize-indexes] existing indexes:');
  before.forEach(i => console.log('  ', i.name, JSON.stringify(i.key)));

  const targets = [
    {
      key: { status: 1, stock: 1, salesCount: -1, createdAt: -1 },
      opts: { name: 'status_stock_salesCount_createdAt', background: true },
    },
    {
      key: { category: 1, salesCount: -1 },
      opts: { name: 'category_salesCount', background: true },
    },
  ];

  for (const t of targets) {
    try {
      const name = await col.createIndex(t.key, t.opts);
      console.log(`[optimize-indexes] ensured ${name}`);
    } catch (err) {
      console.error(`[optimize-indexes] failed for ${t.opts.name}:`, err.message);
    }
  }

  const after = await col.indexes();
  console.log('[optimize-indexes] final indexes:');
  after.forEach(i => console.log('  ', i.name, JSON.stringify(i.key)));

  await mongoose.disconnect();
  console.log('[optimize-indexes] done.');
}

main().catch(err => {
  console.error('[optimize-indexes] fatal:', err.message);
  process.exit(1);
});
