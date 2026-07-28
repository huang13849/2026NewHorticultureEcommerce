const express = require('express');
const router = express.Router();
const db = require('../lib/db');

// ===== Haversine 距离计算 =====
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

// ===== 列表页只需要的字段（避免拉大数组、显著减小 payload） =====
// title/flowerName/englishTitle 用于展示 + 前端 fallback 搜索
// panorama_images/detail_images 里各取第 1 张即可，但 gateway 目前只支持整字段 projection，
// 所以只挑首图字段之一 + images(小数组)。product 详情页仍走 /:id 拿完整数据。
const LIST_FIELDS = [
  '_id',
  'title',
  'flowerName',
  'englishTitle',
  'category',
  'price',
  'sellPrice',
  'settlementPrice',
  'costPrice',
  'shippingFee',
  'shipping_description',
  'stock',
  'salesCount',
  'salesVolume',
  'origin',
  'supplierId',
  'supplier_id',
  'sellerName',
  'location',
  // 图片字段：首页/shop 列表只显示一张，客户端 getImg() 按优先级取第 1 张，
  // 因此保留这三个字段。若单张有多 URL，后端会返回整数组，前端只用 [0]。
  'images',
  'panorama_images',
  'detail_images',
  'createdAt',
  'updatedAt',
].join(',');

/**
 * 是否使用 MongoDB 文本索引（$text）走全文搜索。
 * products 集合已有 text 索引：title_text_description_text_flowerName_text
 * 命中该索引后 stage = TEXT_MATCH，比 $regex 全表扫描/前缀扫描快得多，
 * 且对多字段（标题+描述+品名）加权更合理。
 *
 * 为了保留旧的分类精确过滤 + 兜底 flowerName/category 子串行为，
 * 组合关键词时优先 $text，若关键词很短（<2 字符）则退回 title 前缀正则（能走 title_1 索引）。
 */
function buildKeywordFilter(keywordRaw) {
  const keyword = String(keywordRaw || '').trim();
  if (!keyword) return null;

  // 极短关键词（1 个字符）用前缀正则命中 title_1 单字段索引
  if (keyword.length < 2) {
    const safe = keyword.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    return { title: { $regex: '^' + safe, $options: 'i' } };
  }

  // 常规查询：走 $text 全文索引（title+description+flowerName），
  // 中文 MongoDB 默认走 none language，仍能按整词匹配。
  return { $text: { $search: keyword } };
}

// ===== 获取商品列表（支持地理围栏筛选） =====
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      keyword,
      lng,
      lat,
      radius = 50,
      sort = 'recommend',
      includeOutOfStock = 'false',
      fullFields, // 兼容参数：显式指定时返回完整字段（详情/预览用）
    } = req.query;

    const filter = { status: { $ne: 'deleted' } };
    if (includeOutOfStock !== 'true') {
      filter.stock = { $gt: 0 };
    }

    // 关键词：优先 $text（走 title/description/flowerName 复合文本索引）
    const kwFilter = buildKeywordFilter(keyword);
    if (kwFilter) Object.assign(filter, kwFilter);

    // 分类精确过滤：走 category_1 单字段索引
    if (category) {
      filter.category = category;
    }

    let sortOption = {};
    switch (sort) {
      case 'price_asc': sortOption = { price: 1 }; break;
      case 'price_desc': sortOption = { price: -1 }; break;
      case 'newest': sortOption = { createdAt: -1 }; break;
      case 'recommend':
      default: sortOption = { salesCount: -1, createdAt: -1 }; break;
    }

    // 只返回列表页需要的字段，减小网络载荷（原来一条 product 有多组大数组，limit=500 时 ~470KB）
    const findOpts = {
      filter,
      sort: sortOption,
      page: parseInt(page),
      limit: parseInt(limit),
    };
    if (fullFields !== 'true') findOpts.fields = LIST_FIELDS;

    const products = await db.find('products', findOpts);

    // 如果有经纬度，计算距离
    if (lng && lat) {
      const userLng = parseFloat(lng);
      const userLat = parseFloat(lat);
      products.forEach(p => {
        if (p.location && p.location.coordinates) {
          p.distance = calculateDistance(
            userLat, userLng,
            p.location.coordinates[1], p.location.coordinates[0]
          );
        }
      });
      // 按距离排序
      if (sort === 'distance') {
        products.sort((a, b) => (a.distance || 9999) - (b.distance || 9999));
      }
      // 过滤距离范围
      const radiusKm = parseFloat(radius);
      const filtered = products.filter(p => !p.distance || p.distance <= radiusKm);
      if (filtered.length > 0) {
        return res.json({ products: filtered, total: filtered.length, page: parseInt(page) });
      }
    }

    const total = await db.count('products', filter);
    res.json({ products, total, page: parseInt(page) });
  } catch (err) {
    console.error('Products error:', err);
    res.status(500).json({ error: '获取商品列表失败' });
  }
});

// ===== 获取商品详情 =====
router.get('/:id', async (req, res) => {
  try {
    const product = await db.findById('products', req.params.id);
    if (!product) return res.status(404).json({ error: '商品不存在' });

    // 获取供应商信息
    if (product.supplierId) {
      try {
        const supplier = await db.findById('suppliers', product.supplierId);
        product.supplier = supplier ? {
          id: supplier._id,
          name: supplier.name,
          address: supplier.address,
          location: supplier.location,
        } : null;
      } catch (e) {
        product.supplier = null;
      }
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: '获取商品详情失败' });
  }
});

// ===== 获取商品分类 =====
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = await db.distinct('products', 'category', { category: { $exists: true } });
    res.json({ categories: categories.filter(Boolean) });
  } catch (err) {
    res.status(500).json({ error: '获取分类失败' });
  }
});

// ===== 获取地图上的商品标记点 =====
router.get('/map/markers', async (req, res) => {
  try {
    const { swLng, swLat, neLng, neLat } = req.query;

    const filter = {
      status: { $ne: 'deleted' },
      stock: { $gt: 0 },
    };

    // 如果有边界坐标，使用 $geoWithin 聚合
    if (swLng && neLng) {
      filter.$and = [
        { 'location.coordinates.0': { $gte: parseFloat(swLng), $lte: parseFloat(neLng) } },
        { 'location.coordinates.1': { $gte: parseFloat(swLat), $lte: parseFloat(neLat) } },
      ];
    }

    const markers = await db.find('products', {
      filter,
      fields: 'name,price,images,location,category,supplierId',
    });

    // 按供应商聚合
    const grouped = {};
    markers.forEach(m => {
      const key = m.supplierId?.toString() || m._id.toString();
      if (!grouped[key]) {
        grouped[key] = {
          supplierId: m.supplierId,
          location: m.location,
          products: [],
        };
      }
      grouped[key].products.push({
        id: m._id,
        name: m.name,
        price: m.price,
        image: m.images?.[0],
        category: m.category,
      });
    });

    res.json({ markers: Object.values(grouped) });
  } catch (err) {
    console.error('Map markers error:', err);
    res.status(500).json({ error: '获取地图标记失败' });
  }
});

module.exports = router;
