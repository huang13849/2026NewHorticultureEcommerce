const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { generateRecommendations } = require('../services/recommend');

const JWT_SECRET = process.env.JWT_SECRET || 'flower-shop-secret-2024';
const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({}, { strict: false, collection: 'products' }));

// ===== 智能推荐（基于位置+手机号+session行为） =====
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
        const User = mongoose.models.User || mongoose.model('User');
        user = await User.findById(userId).lean();
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
    const newProducts = await Product.find({ status: { $ne: 'deleted' } })
      .sort({ createdAt: -1 }).limit(6).lean();
    // 3. 特价推荐
    const onSale = await Product.find({ status: { $ne: 'deleted' }, discountPrice: { $exists: true, $gt: 0 } })
      .sort({ discountPrice: 1 }).limit(6).lean();

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
  // 如果有位置，优先附近的
  const products = await Product.find(query)
    .sort({ salesCount: -1, createdAt: -1 })
    .limit(limit * 3)
    .lean();

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

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = router;
