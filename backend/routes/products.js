const express = require('express');
const router = express.Router();
const pg = require('../lib/pg');

// ===== Haversine 距离 =====
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// ===== SQL 字段别名 (snake_case -> camelCase) =====
// 列表页只 select 这些列;SELECT 后端 AS 一下,前端不必改
const COL_ALIASES = {
  id:                '_id',
  title:             'title',
  english_title:     'englishTitle',
  flower_name:       'flowerName',
  category:          'category',
  sell_price:        'sellPrice',
  settlement_price:  'settlementPrice',
  cost_price:        'costPrice',
  shipping_fee:      'shippingFee',
  shipping_description: 'shipping_description',
  stock:             'stock',
  sales_volume:      'salesCount',         // Mongo 时代 salesCount -> sales_volume
  origin:            'origin',
  supplier_id:       'supplierId',
  supplier_name:     'supplierName',
  seller_name:       'sellerName',
  location:          'location',
  images:            'images',
  panorama_images:   'panorama_images',
  detail_images:     'detail_images',
  package_images:    'package_images',
  root_soil_images:  'root_soil_images',
  scene_images:      'scene_images',
  created_at:        'createdAt',
  updated_at:        'updatedAt',
};

const LIST_FIELDS = [
  '_id','title','flowerName','englishTitle','category','price','sellPrice',
  'settlementPrice','costPrice','shippingFee','shipping_description','stock',
  'salesCount','origin','supplierId','supplier_id','sellerName',
  'images','panorama_images','detail_images','createdAt','updatedAt',
];

const SPECIAL_ALIASES = {
  price: 'COALESCE(sell_price, settlement_price, 0)',
};

function buildSelect(fields) {
  const list = fields && fields.length ? fields : LIST_FIELDS;
  // camelCase -> snake 找到原列名
  const camelToSnake = Object.fromEntries(Object.entries(COL_ALIASES).map(([k,v]) => [v, k]));
  const cols = list.map(c => {
    if (SPECIAL_ALIASES[c]) return `${SPECIAL_ALIASES[c]} AS "${c}"`;
    const snake = camelToSnake[c] || c;
    if (snake === c) return `"${snake}"`;
    return `"${snake}" AS "${c}"`;
  });
  return cols.join(', ');
}

// ===== MongoDB-style filter -> SQL WHERE =====
// 支持:
//   { field: value }                -> field = $1
//   { field: { $ne: v } }           -> field != $1
//   { field: { $gt: n } }           -> field > $1
//   { field: { $gte: n } }          -> field >= $1
//   { field: { $lt: n } }           -> field < $1
//   { field: { $lte: n } }          -> field <= $1
//   { $text: { $search: kw } }      -> (title ILIKE ... OR flower_name ILIKE ... OR description ILIKE ...)
//   { field: { $exists: true } }    -> field IS NOT NULL
//   { $and: [ {...}, {...} ] }      -> (...) AND (...)
//   { location.coordinates.0: { $gte, $lte } }   -> location->'coordinates'->0 >= ... AND <= ...
function buildWhere(filter, params) {
  if (!filter || Object.keys(filter).length === 0) return { sql: '1=1', params };
  const conds = [];
  for (const [k, v] of Object.entries(filter)) {
    if (k === '$and' && Array.isArray(v)) {
      const subs = v.map(sub => {
        const r = buildWhere(sub, params);
        params = r.params;
        return r.sql;
      });
      conds.push('(' + subs.join(' AND ') + ')');
      continue;
    }
    if (k === '$text' && v && v.$search) {
      const kw = String(v.$search).replace(/[%_]/g, '\\$&');
      params.push('%' + kw + '%');
      const i = params.length;
      conds.push(`(title ILIKE $${i} OR flower_name ILIKE $${i} OR description ILIKE $${i})`);
      continue;
    }
    // nested jsonb 路径: location.coordinates.0 -> location->'coordinates'->>0
    const pathParts = k.split('.');
    const col = pathParts[0];
    let colExpr = '"' + col + '"';
    for (let i = 1; i < pathParts.length; i++) {
      const p = pathParts[i];
      if (/^\d+$/.test(p)) colExpr += `->${p}`;
      else colExpr += `->'${p}'`;
    }
    if (v === null || v === undefined) {
      conds.push(colExpr + ' IS NULL');
      continue;
    }
    if (typeof v !== 'object') {
      params.push(v);
      conds.push(colExpr + ' = $' + params.length);
      continue;
    }
    const ops = [];
    for (const [op, val] of Object.entries(v)) {
      if (op === '$ne')  { params.push(val); ops.push(colExpr + ' != $' + params.length); }
      else if (op === '$gt')  { params.push(val); ops.push(colExpr + ' > $'  + params.length); }
      else if (op === '$gte') { params.push(val); ops.push(colExpr + ' >= $' + params.length); }
      else if (op === '$lt')  { params.push(val); ops.push(colExpr + ' < $'  + params.length); }
      else if (op === '$lte') { params.push(val); ops.push(colExpr + ' <= $' + params.length); }
      else if (op === '$exists' && val) { ops.push(colExpr + ' IS NOT NULL'); }
      else if (op === '$exists' && !val) { ops.push(colExpr + ' IS NULL'); }
      else if (op === '$in' && Array.isArray(val)) {
        const placeholders = val.map(x => { params.push(x); return '$' + params.length; }).join(',');
        ops.push(colExpr + ' IN (' + placeholders + ')');
      } else if (op === '$regex') {
        params.push(val);
        ops.push(colExpr + ' ~* $' + params.length);
      }
    }
    if (ops.length === 1) conds.push(ops[0]);
    else if (ops.length > 1) conds.push('(' + ops.join(' AND ') + ')');
  }
  return { sql: conds.join(' AND '), params };
}

// ===== sort =====
// { salesCount: -1, createdAt: -1 } -> sales_volume DESC, created_at DESC
const SORT_MAP = {
  salesCount: 'sales_volume',
  salesVolume: 'sales_volume',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  price: 'sell_price',
  sellPrice: 'sell_price',
  stock: 'stock',
};
function buildSort(sort) {
  if (!sort || typeof sort !== 'object') return 'sales_volume DESC, created_at DESC';
  const parts = [];
  for (const [k, dir] of Object.entries(sort)) {
    const col = SORT_MAP[k] || k;
    parts.push('"' + col + '" ' + (dir === 1 || dir === 'asc' ? 'ASC' : 'DESC'));
  }
  return parts.length ? parts.join(', ') : 'sales_volume DESC, created_at DESC';
}

// 图片 URL 重写 (与原 db.js 一致)
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

// ===== 列表页 =====
router.get('/', async (req, res) => {
  try {
    const {
      page = 1, limit = 20, category, keyword, lng, lat,
      radius = 50, sort = 'recommend',
      includeOutOfStock = 'false', fullFields,
    } = req.query;

    const filter = {};
    // status: 旧 Mongo 时代用 status 字段(默认非 deleted),CNPG products 表无 status 列,默认全部
    // 即: includeOutOfStock=false -> stock > 0
    if (includeOutOfStock !== 'true') filter.stock = { $gt: 0 };
    if (category) filter.category = category;
    if (keyword && String(keyword).trim()) {
      const kw = String(keyword).trim();
      if (kw.length < 2) {
        filter.title = { $regex: '^' + kw.replace(/[%_]/g, '\\$&') };
      } else {
        filter.$text = { $search: kw };
      }
    }

    let sortObj = {};
    if (sort === 'price_asc')  sortObj = { sellPrice: 1 };
    else if (sort === 'price_desc') sortObj = { sellPrice: -1 };
    else if (sort === 'newest') sortObj = { createdAt: -1 };
    else sortObj = { salesCount: -1, createdAt: -1 };

    const useFull = fullFields === 'true';
    const fields = useFull ? null : LIST_FIELDS;

    const params = [];
    const where = buildWhere(filter, params);
    const orderBy = buildSort(sortObj);
    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit));
    params.push(offset);

    const sql = `SELECT ${buildSelect(fields)} FROM products WHERE ${where.sql} ORDER BY ${orderBy} LIMIT $${params.length-1} OFFSET $${params.length}`;
    const products = (await pg.findMany(sql, params)).map(rewriteImg);

    // 距离计算
    if (lng && lat) {
      const userLng = parseFloat(lng), userLat = parseFloat(lat);
      products.forEach(p => {
        const coords = p.location && p.location.coordinates;
        if (Array.isArray(coords) && coords.length >= 2) {
          p.distance = calculateDistance(userLat, userLng, coords[1], coords[0]);
        }
      });
      if (sort === 'distance') products.sort((a,b) => (a.distance||9999) - (b.distance||9999));
      const radiusKm = parseFloat(radius);
      const filtered = products.filter(p => !p.distance || p.distance <= radiusKm);
      if (filtered.length > 0) return res.json({ products: filtered, total: filtered.length, page: parseInt(page) });
    }

    const totalRow = await pg.findOne(
      `SELECT COUNT(*)::int AS total FROM products WHERE ${where.sql}`,
      params.slice(0, params.length - 2)
    );
    res.json({ products, total: totalRow.total, page: parseInt(page) });
  } catch (err) {
    console.error('Products error:', err);
    res.status(500).json({ error: '获取商品列表失败' });
  }
});

// ===== 详情 =====
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'invalid id' });
    const row = await pg.findOne(
      `SELECT ${buildSelect(null)} FROM products WHERE id = $1`,
      [id]
    );
    if (!row) return res.status(404).json({ error: '商品不存在' });
    const product = rewriteImg(row);

    if (product.supplierId) {
      try {
        const supRow = await pg.findOne(
          `SELECT id AS "id", name AS "name", address AS "address", location AS "location" FROM suppliers WHERE id = $1`,
          [product.supplierId]
        );
        if (supRow) product.supplier = rewriteImg(supRow);
        else product.supplier = null;
      } catch (e) { product.supplier = null; }
    }
    res.json(product);
  } catch (err) {
    console.error('Product detail error:', err);
    res.status(500).json({ error: '获取商品详情失败' });
  }
});

// ===== 分类 distinct =====
router.get('/meta/categories', async (req, res) => {
  try {
    const rows = await pg.findMany(
      `SELECT DISTINCT category AS "category" FROM products WHERE category IS NOT NULL AND category <> '' ORDER BY category`
    );
    res.json({ categories: rows.map(r => r.category).filter(Boolean) });
  } catch (err) {
    console.error('Categories error:', err);
    res.status(500).json({ error: '获取分类失败' });
  }
});

// ===== 地图 markers =====
router.get('/map/markers', async (req, res) => {
  try {
    const { swLng, swLat, neLng, neLat } = req.query;
    const params = [];
    const conds = ['stock > 0'];
    if (swLng && neLng && swLat && neLat) {
      params.push(parseFloat(swLng)); params.push(parseFloat(neLng));
      params.push(parseFloat(swLat)); params.push(parseFloat(neLat));
      conds.push(`(location->'coordinates'->>0)::float BETWEEN $${params.length-3} AND $${params.length-2}`);
      conds.push(`(location->'coordinates'->>1)::float BETWEEN $${params.length-1} AND $${params.length}`);
    }
    const rows = await pg.findMany(
      `SELECT id AS "id", title AS "name", sell_price AS "price", images, category, supplier_id AS "supplierId" FROM products WHERE ${conds.join(' AND ')} LIMIT 500`,
      params
    );
    const grouped = {};
    rows.forEach(m => {
      const key = m.supplierId || String(m.id);
      if (!grouped[key]) grouped[key] = { supplierId: m.supplierId, location: m.location, products: [] };
      grouped[key].products.push({
        id: m.id, name: m.name, price: m.price,
        image: Array.isArray(m.images) ? m.images[0] : undefined,
        category: m.category,
      });
    });
    res.json({ markers: Object.values(grouped).map(rewriteImg) });
  } catch (err) {
    console.error('Map markers error:', err);
    res.status(500).json({ error: '获取地图标记失败' });
  }
});

module.exports = router;
