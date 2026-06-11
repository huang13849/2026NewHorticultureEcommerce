/**
 * 智能推荐引擎
 * 基于用户位置、手机号、session 行为、浏览历史进行多维度推荐
 */
const mongoose = require('mongoose');

const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({}, { strict: false, collection: 'products' }));

async function generateRecommendations({ user, location, sessionId, limit = 10 }) {
  const scores = new Map(); // productId -> score

  // 1. 基于位置的推荐（附近花店/供应商优先）
  if (location) {
    const nearbyProducts = await getNearbyProducts(location, limit * 3);
    nearbyProducts.forEach((p, idx) => {
      const distScore = Math.max(0, 100 - (p.distance || 0) * 2); // 距离越近分越高
      addScore(scores, p._id.toString(), distScore, p);
    });
  }

  // 2. 基于用户历史偏好（浏览/购买分类）
  if (user?.preferences?.categories?.length) {
    const preferredProducts = await Product.find({
      status: { $ne: 'deleted' },
      category: { $in: user.preferences.categories },
    }).limit(limit * 2).lean();
    preferredProducts.forEach(p => {
      addScore(scores, p._id.toString(), 30, p); // 偏好分类加分
    });
  }

  // 3. 基于热门度
  const hotProducts = await Product.find({ status: { $ne: 'deleted' } })
    .sort({ salesCount: -1 }).limit(limit * 2).lean();
  hotProducts.forEach((p, idx) => {
    const hotScore = Math.max(0, 20 - idx);
    addScore(scores, p._id.toString(), hotScore, p);
  });

  // 4. 新品加分
  const newProducts = await Product.find({ status: { $ne: 'deleted' } })
    .sort({ createdAt: -1 }).limit(limit).lean();
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
  const products = await Product.find({
    status: { $ne: 'deleted' },
    'location.coordinates': { $exists: true },
  }).limit(limit * 5).lean();

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

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

module.exports = { generateRecommendations };
