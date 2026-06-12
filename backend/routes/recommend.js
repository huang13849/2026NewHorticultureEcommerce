const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../lib/db');

const JWT_SECRET = process.env.JWT_SECRET || 'flower-shop-secret-2024';

// ===== Haversine 距离计算 =====
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ===== 智能推荐（基于位置+用户） =====
router.get('/', async (req, res) => {
  try {
    const { lng, lat, sessionId, limit = 10 } = req.query;
    const auth = req.headers.authorization;

    let userId = null;
    let user = null;

    if (auth) {
      try {
        const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
        userId = decoded.userId;
        user = await db.findById('users', userId);
      } catch (e) { /* 未登录，游客模式 */ }
    }

    const recommendations = await generateRecommendations({
      user,
      location: lng && lat ? { lng: parseFloat(lng), lat: parseFloat(lat) } : null,
      sessionId,
      limit: parseInt(limit),
    });

    res.json({ recommendations });
  } catch (err) {
    console.error('Recommend error:', err);
    res.status(500).json({ error: '推荐失败' });
  }
});

// ===== 首页推荐（多维度混合） =====
router.get('/home', async (req, res) => {
  try {
    const { lng, lat } = req.query;
    const location = lng && lat ? { lng: parseFloat(lng), lat: parseFloat(lat) } : null;

    // 1. 附近热门
    const nearbyHot = await getNearbyHot(location, 6);
    // 2. 新品推荐
    const newProducts = await db.find('products', {
      filter: { status: { $ne: 'deleted' } },
      sort: { createdAt: -1 },
      limit: 6,
    });
    // 3. 特价推荐
    const onSale = await db.find('products', {
      filter: { status: { $ne: 'deleted' }, discountPrice: { $exists: true, $gt: 0 } },
      sort: { discountPrice: 1 },
      limit: 6,
    });

    res.json({
      sections: [
        { title: '🌿 附近热门', type: 'nearby', products: nearbyHot },
        { title: '🆕 新品上架', type: 'new', products: newProducts },
        { title: '💰 特价花材', type: 'sale', products: onSale },
      ],
    });
  } catch (err) {
    console.error('Home recommend error:', err);
    res.status(500).json({ error: '获取首页推荐失败' });
  }
});

async function getNearbyHot(location, limit) {
  const query = { status: { $ne: 'deleted' } };
  const products = await db.find('products', {
    filter: query,
    sort: { salesCount: -1, createdAt: -1 },
    limit: limit * 3,
  });

  if (location) {
    products.forEach(p => {
      if (p.location?.coordinates) {
        p.distance = haversine(location.lat, location.lng, p.location.coordinates[1], p.location.coordinates[0]);
      }
    });
    products.sort((a, b) => (a.distance || 9999) - (b.distance || 9999));
    return products.slice(0, limit);
  }
  return products.slice(0, limit);
}

// ===== 推荐引擎实现 =====
async function generateRecommendations({ user, location, sessionId, limit = 10 }) {
  const scores = new Map(); // productId -> { score, product, reason }

  // 1. 基于位置的推荐
  if (location) {
    const nearbyProducts = await getNearbyProducts(location, limit * 3);
    nearbyProducts.forEach((p, idx) => {
      const distScore = Math.max(0, 100 - (p.distance || 0) * 2);
      addScore(scores, p._id.toString(), distScore, p);
    });
  }

  // 2. 基于用户历史偏好
  if (user?.preferences?.categories?.length) {
    const preferredProducts = await db.find('products', {
      filter: { status: { $ne: 'deleted' }, category: { $in: user.preferences.categories } },
      limit: limit * 2,
    });
    preferredProducts.forEach(p => {
      addScore(scores, p._id.toString(), 30, p);
    });
  }

  // 3. 基于热门度
  const hotProducts = await db.find('products', {
    filter: { status: { $ne: 'deleted' } },
    sort: { salesCount: -1 },
    limit: limit * 2,
  });
  hotProducts.forEach((p, idx) => {
    const hotScore = Math.max(0, 20 - idx);
    addScore(scores, p._id.toString(), hotScore, p);
  });

  // 4. 新品加分
  const newProducts = await db.find('products', {
    filter: { status: { $ne: 'deleted' } },
    sort: { createdAt: -1 },
    limit: limit,
  });
  newProducts.forEach((p, idx) => {
    addScore(scores, p._id.toString(), Math.max(0, 15 - idx), p);
  });

  // 排序并返回
  const sorted = [...scores.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit)
    .map(([id, data]) => ({
      ...data.product,
      recommendScore: Math.round(data.score),
      recommendReason: data.reason,
    }));

  // 如果推荐不足，补充热门商品
  if (sorted.length < limit) {
    const existingIds = new Set(sorted.map(p => p._id?.toString()));
    const fillers = hotProducts.filter(p => !existingIds.has(p._id.toString()));
    sorted.push(...fillers.slice(0, limit - sorted.length));
  }

  return sorted;
}

function addScore(scores, productId, score, product, reason = '智能推荐') {
  if (scores.has(productId)) {
    const existing = scores.get(productId);
    existing.score += score;
    if (score > 10) existing.reason = reason;
  } else {
    scores.set(productId, { score, product, reason });
  }
}

async function getNearbyProducts(location, limit) {
  const products = await db.find('products', {
    filter: {
      status: { $ne: 'deleted' },
      'location.coordinates': { $exists: true },
    },
    limit: limit * 5,
  });

  products.forEach(p => {
    if (p.location?.coordinates) {
      p.distance = haversine(
        location.lat, location.lng,
        p.location.coordinates[1], p.location.coordinates[0]
      );
    }
  });

  products.sort((a, b) => (a.distance || 9999) - (b.distance || 9999));
  return products.slice(0, limit);
}

module.exports = router;
