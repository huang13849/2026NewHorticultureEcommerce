const express = require('express');
const router = express.Router();
const db = require('../lib/db');

function getProductImage(p) {
  const raw = (p.videoCover || p.cover || (p.images || [])[0] || (p.panorama_images || [])[0] || (p.detail_images || [])[0] || (p.package_images || [])[0] || (p.scene_images || [])[0] || (p.root_soil_images || [])[0] || '');
  if (!raw) return '';
  if (String(raw).startsWith('http')) return raw;
  return `http://100.96.54.109:9000/supply-chain/${raw}`;
}

function getVideoUrl(p) {
  return p.videoUrl || p.video_url || p.shortVideo || p.short_video || p.productVideo || p.product_video || '';
}

function productTitle(p) {
  return p.title || p.name || p.flowerName || p.product_name || '花卉商品';
}

// ===== 获取地图可视区域内的商品/供应商 =====
router.get('/viewport', async (req, res) => {
  try {
    const { swLng, swLat, neLng, neLat, zoom = 12 } = req.query;

    if (!swLng || !neLng) {
      return res.status(400).json({ error: '需要地图边界参数' });
    }

    const suppliers = await db.find('suppliers', {
      filter: {
        'location.coordinates': { $exists: true },
        $and: [
          { 'location.coordinates.0': { $gte: parseFloat(swLng), $lte: parseFloat(neLng) } },
          { 'location.coordinates.1': { $gte: parseFloat(swLat), $lte: parseFloat(neLat) } },
        ],
      },
    });

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

// ===== 短视频逛店 Feed =====
router.get('/supplier-video-feed/:id', async (req, res) => {
  try {
    const supplierId = req.params.id;
    const supplierName = req.query.name || '';

    let supplier = null;
    try { supplier = await db.findById('suppliers', supplierId); } catch { /* empty */ }
    if (!supplier) {
      try { supplier = await db.findById('supplier', supplierId); } catch { /* empty */ }
    }

    let products = [];
    const filters = [
      { supplierId, status: { $ne: 'deleted' } },
      { supplier_id: supplierId, status: { $ne: 'deleted' } },
    ];

    for (const filter of filters) {
      try {
        products = await db.find('products', { filter, limit: 30 });
        if (products && products.length) break;
      } catch { /* empty */ }
    }

    // 如果用 id 找不到商品，尝试用供应商名模糊兜底；再兜底推荐商品
    const name = supplier?.name || supplier?.shop_name || supplierName;
    if ((!products || products.length === 0) && name) {
      try {
        products = await db.find('products', { filter: { sellerName: { $like: `%${name}%` }, status: { $ne: 'deleted' } }, limit: 30 });
      } catch { /* empty */ }
    }
    if (!products || products.length === 0) {
      products = await db.find('products', { filter: { status: { $ne: 'deleted' } }, limit: 20 });
    }

    const videos = (products || []).map((p, idx) => ({
      id: p._id || `${supplierId}-${idx}`,
      productId: p._id,
      supplierId,
      supplierName: name || '花卉商家',
      title: productTitle(p),
      description: p.description || p.specSize || p.category || '产地直供 · 实拍商品 · 支持批发采购',
      price: Number(p.sellPrice || p.price || p.settlementPrice || 0),
      category: p.category || '',
      cover: getProductImage(p),
      videoUrl: getVideoUrl(p),
      likes: 128 + idx * 37,
      comments: 12 + idx * 5,
      distance: p.distance || null,
    })).filter(v => v.cover || v.videoUrl);

    res.json({
      supplier: {
        id: supplierId,
        name: name || '花卉商家',
        address: supplier?.address || supplier?.company_info?.address || '',
        phone: supplier?.phone || supplier?.contact_phone || '',
        description: supplier?.description || supplier?.company_info?.main_business || '',
      },
      videos,
      total: videos.length,
    });
  } catch (err) {
    console.error('Supplier video feed error:', err);
    res.status(500).json({ error: '获取商家短视频失败' });
  }
});

module.exports = router;
