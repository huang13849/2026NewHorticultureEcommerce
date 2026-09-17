const express = require('express');
const router = express.Router();
const pg = require('../lib/pg');

// Haversine 距离
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const LIST_FIELDS = '_id,title,flowerName,englishTitle,category,sellPrice AS price,settlementPrice,costPrice,shippingFee,shipping_description,stock,sales_volume AS "salesCount",sales_volume AS "salesVolume",origin,supplier_id AS "supplierId",supplier_id AS "supplier_id",seller_name AS "sellerName",location,images,panorama_images,detail_images,created_at AS "createdAt",updated_at AS "updatedAt"';

function listSelect() {
  // 列表选择 — 与 products.js 一致 (snake->camel 别名)
  return [
    'id AS "_id"',
    'title',
    'english_title AS "englishTitle"',
    'flower_name AS "flowerName"',
    'category',
    'sell_price AS "sellPrice"',
    'COALESCE(sell_price, settlement_price, 0) AS "price"',
    'settlement_price AS "settlementPrice"',
    'cost_price AS "costPrice"',
    'shipping_fee AS "shippingFee"',
    'shipping_description',
    'stock',
    'sales_volume AS "salesCount"',
    'sales_volume AS "salesVolume"',
    'origin',
    'supplier_id AS "supplierId"',
    'supplier_id AS "supplier_id"',
    'seller_name AS "sellerName"',
    'images',
    'panorama_images',
    'detail_images',
    'created_at AS "createdAt"',
    'updated_at AS "updatedAt"',
  ].join(', ');
}

const REWRITE_FROM = process.env.MINIO_REWRITE_FROM || '';
const REWRITE_TO   = process.env.MINIO_REWRITE_TO   || '';
const REWRITE_ENABLED = REWRITE_FROM && REWRITE_TO;
function rewriteImg(v) {
  if (!REWRITE_ENABLED || v == null) return v;
  if (typeof v === 'string') return v.includes(REWRITE_FROM) ? v.split(REWRITE_FROM).join(REWRITE_TO) : v;
  if (Array.isArray(v)) { for (let i=0;i<v.length;i++) v[i] = rewriteImg(v[i]); return v; }
  if (typeof v === 'object') { for (const k of Object.keys(v)) v[k] = rewriteImg(v[k]); return v; }
  return v;
}

// 附近热门 - 直接 CNPG 查询
async function getNearbyHot(location, limit) {
  const rows = await pg.findMany(
    `SELECT ${listSelect()} FROM products WHERE stock > 0 ORDER BY sales_volume DESC, created_at DESC LIMIT $1`,
    [limit * 3]
  );
  const products = rows.map(rewriteImg);
  // products 表无 location 列; 跳过距离过滤 (后续可 join suppliers 取坐标)
  return products.slice(0, limit);
}

// 首页推荐 - 三个分组
router.get('/home', async (req, res) => {
  try {
    const { lng, lat } = req.query;
    const location = lng && lat ? { lng: parseFloat(lng), lat: parseFloat(lat) } : null;
    const seenIds = new Set();
    const takeUnique = (arr, limit = 6) => {
      const out = [];
      for (const p of arr || []) {
        const id = String(p._id);
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id); out.push(p);
        if (out.length >= limit) break;
      }
      return out;
    };

    const nearbyHot   = takeUnique(await getNearbyHot(location, 18), 6);
    const newProducts = takeUnique((await pg.findMany(
      `SELECT ${listSelect()} FROM products WHERE stock > 0 ORDER BY created_at DESC LIMIT $1`, [18]
    )).map(rewriteImg), 6);

    // 特价: 有 discountPrice 列就查,没有就跳过该分组
    let onSale = [];
    try {
      const cols = await pg.findMany(
        `SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name='discount_price'`
      );
      if (cols.length) {
        onSale = takeUnique((await pg.findMany(
          `SELECT ${listSelect()} FROM products WHERE stock > 0 AND discount_price IS NOT NULL AND discount_price > 0 ORDER BY discount_price ASC LIMIT $1`, [18]
        )).map(rewriteImg), 6);
      }
    } catch (e) { /* 表无该列时跳过 */ }

    res.json({
      sections: [
        { title: '🌿 附近热门', type: 'nearby', products: nearbyHot },
        { title: '🆕 新品上架', type: 'new',     products: newProducts },
        ...(onSale.length ? [{ title: '💰 特价花材', type: 'sale', products: onSale }] : []),
      ],
    });
  } catch (err) {
    console.error('Home recommend error:', err);
    res.status(500).json({ error: '获取首页推荐失败' });
  }
});

// 智能推荐 (无用户历史版 - 跳过需要 users 的部分, 走位置+热度)
router.get('/', async (req, res) => {
  try {
    const { lng, lat, limit = 10 } = req.query;
    const location = lng && lat ? { lng: parseFloat(lng), lat: parseFloat(lat) } : null;
    const products = await getNearbyHot(location, parseInt(limit));
    res.json({ recommendations: products });
  } catch (err) {
    console.error('Recommend error:', err);
    res.status(500).json({ error: '推荐失败' });
  }
});

module.exports = router;
