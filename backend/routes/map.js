const express = require('express');
const router = express.Router();
const db = require('../lib/db');

// ===== 获取地图可视区域内的商品/供应商 =====
router.get('/viewport', async (req, res) => {
  try {
    const { swLng, swLat, neLng, neLat, zoom = 12 } = req.query;

    if (!swLng || !neLng) {
      return res.status(400).json({ error: '需要地图边界参数' });
    }

    // 获取区域内的供应商（通过坐标范围过滤）
    const suppliers = await db.find('suppliers', {
      filter: {
        'location.coordinates': { $exists: true },
        $and: [
          { 'location.coordinates.0': { $gte: parseFloat(swLng), $lte: parseFloat(neLng) } },
          { 'location.coordinates.1': { $gte: parseFloat(swLat), $lte: parseFloat(neLat) } },
        ],
      },
    });

    // 获取每个供应商的商品数量
    const supplierIds = suppliers.map(s => s._id);
    let countsMap = {};

    if (supplierIds.length > 0) {
      const productCounts = await db.aggregate('products', [
        { $match: { supplierId: { $in: supplierIds }, status: { $ne: 'deleted' } } },
        { $group: { _id: '$supplierId', count: { $sum: 1 }, avgPrice: { $avg: '$price' } } },
      ]);
      productCounts.forEach(pc => { countsMap[pc._id.toString()] = pc; });
    }

    const markers = suppliers.map(s => ({
      id: s._id,
      name: s.name,
      location: s.location,
      address: s.address,
      productCount: countsMap[s._id.toString()]?.count || 0,
      avgPrice: countsMap[s._id.toString()]?.avgPrice || 0,
      phone: s.phone,
      categories: s.categories || [],
    })).filter(m => m.productCount > 0);

    res.json({ markers, total: markers.length });
  } catch (err) {
    console.error('Map viewport error:', err);
    res.status(500).json({ error: '获取地图数据失败' });
  }
});

// ===== 获取某个位置附近的商品 =====
router.get('/nearby', async (req, res) => {
  try {
    const { lng, lat, radius = 10, limit = 20 } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({ error: '需要经纬度参数' });
    }

    // 使用聚合的 $geoNear
    const products = await db.aggregate('products', [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: 'distance',
          maxDistance: parseFloat(radius) * 1000,
          query: { status: { $ne: 'deleted' } },
          spherical: true,
        },
      },
      { $limit: parseInt(limit) },
    ]);

    res.json({ products, total: products.length });
  } catch (err) {
    console.error('Map nearby error:', err);
    res.status(500).json({ error: '获取附近商品失败' });
  }
});

// ===== 获取供应商详情 + 商品列表 =====
router.get('/supplier/:id/products', async (req, res) => {
  try {
    const supplier = await db.findById('suppliers', req.params.id);
    if (!supplier) return res.status(404).json({ error: '供应商不存在' });

    const products = await db.find('products', {
      filter: { supplierId: req.params.id, status: { $ne: 'deleted' } },
    });

    res.json({
      supplier: {
        id: supplier._id,
        name: supplier.name,
        address: supplier.address,
        location: supplier.location,
        phone: supplier.phone,
        description: supplier.description,
      },
      products,
    });
  } catch (err) {
    console.error('Supplier products error:', err);
    res.status(500).json({ error: '获取供应商商品失败' });
  }
});

module.exports = router;
