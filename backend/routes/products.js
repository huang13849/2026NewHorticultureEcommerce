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
    } = req.query;

    const filter = { status: { $ne: 'deleted' } };

    if (keyword) {
      filter.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
      ];
    }

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

    const products = await db.find('products', {
      filter,
      sort: sortOption,
      page: parseInt(page),
      limit: parseInt(limit),
    });

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
