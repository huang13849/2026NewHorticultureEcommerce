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

function escapeRegex(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function uniqById(items) {
  const seen = new Set();
  return (items || []).filter(item => {
    const key = String(item?._id || item?.id || JSON.stringify(item));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function supplierNames(supplier, queryName) {
  const businessNames = Array.isArray(supplier?.business_items)
    ? supplier.business_items.map(item => item?.main_business)
    : [];
  return [
    supplier?.shop_name,
    supplier?.name,
    supplier?.company_info?.name,
    supplier?.company_info?.main_business,
    supplier?.sellerName,
    queryName,
    ...businessNames,
  ].map(v => String(v || '').trim()).filter(Boolean);
}

async function findSupplierProducts(supplierId, supplier, queryName) {
  const base = { status: { $ne: 'deleted' } };
  const products = [];

  const filters = [
    { supplierId, ...base },
    { supplier_id: supplierId, ...base },
    { supplier: supplierId, ...base },
    { supplierId: String(supplierId), ...base },
  ];

  const productIds = Array.isArray(supplier?.product_ids) ? supplier.product_ids.filter(Boolean) : [];
  if (productIds.length) {
    filters.push({ _id: { $in: productIds.map(String) }, ...base });
  }

  // 商品表里当前主要用 sellerName 关联“商户名”，不是 supplierId。
  // 精确匹配优先，避免点 A 商家时混入 B 商家的商品。
  const names = supplierNames(supplier, queryName);
  for (const name of names) {
    filters.push({ sellerName: name, ...base });
  }

  for (const filter of filters) {
    try {
      const found = await db.find('products', { filter, limit: 50 });
      if (found && found.length) products.push(...found);
    } catch { /* empty */ }
  }

  // 只有精确匹配无结果时，才做名称包含匹配；仍然限定 sellerName，绝不回退全量商品。
  if (!products.length) {
    for (const name of names) {
      try {
        const found = await db.find('products', {
          filter: { sellerName: { $regex: escapeRegex(name), $options: 'i' }, ...base },
          limit: 50,
        });
        if (found && found.length) products.push(...found);
      } catch { /* empty */ }
    }
  }

  return uniqById(products).slice(0, 50);
}

// ===== 短视频逛店 Feed =====
router.get('/supplier-video-feed/:id', async (req, res) => {
  try {
    const supplierId = req.params.id;
    const supplierName = req.query.name || '';

    let supplier = null;
    // 真实集合名是 supplier；保留 suppliers 兼容旧数据。
    try { supplier = await db.findById('supplier', supplierId); } catch { /* empty */ }
    if (!supplier) {
      try { supplier = await db.findById('suppliers', supplierId); } catch { /* empty */ }
    }

    const name = supplier?.shop_name || supplier?.name || supplierName;
    const products = await findSupplierProducts(supplierId, supplier, supplierName);

    const videos = (products || []).map((p, idx) => ({
      id: p._id || `${supplierId}-${idx}`,
      productId: p._id,
      supplierId,
      supplierName: name || p.sellerName || '花卉商家',
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
        phone: supplier?.phone || supplier?.contact_phone || supplier?.contact?.phone || '',
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
