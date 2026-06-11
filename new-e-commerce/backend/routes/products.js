const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// ===== 从 supply_chain 数据库读取商品 =====
const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({}, { strict: false, collection: 'products' }));
const Supplier = mongoose.models.Supplier || mongoose.model('Supplier', new mongoose.Schema({}, { strict: false, collection: 'suppliers' }));

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
      radius = 50, // km
      sort = 'recommend' 
    } = req.query;

    const query = { status: { $ne: 'deleted' } };

    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    let sortOption = {};
    switch (sort) {
      case 'price_asc': sortOption = { price: 1 }; break;
      case 'price_desc': sortOption = { price: -1 }; break;
      case 'newest': sortOption = { createdAt: -1 }; break;
      case 'recommend':
      default: sortOption = { salesCount: -1, createdAt: -1 }; break;
    }

    const products = await Product.find(query)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

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

    const total = await Product.countDocuments(query);
    res.json({ products, total, page: parseInt(page) });
  } catch (err) {
    console.error('Products error:', err);
    res.status(500).json({ error: '获取商品列表失败' });
  }
});

// ===== 获取商品详情 =====
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ error: '商品不存在' });

    // 获取供应商信息
    if (product.supplierId) {
      try {
        const supplier = await Supplier.findById(product.supplierId).lean();
        product.supplier = supplier ? {
          id: supplier._id,
          name: supplier.name,
          address: supplier.address,
          location: supplier.location,
        } : null;
      } catch(e) { product.supplier = null; }
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: '获取商品详情失败' });
  }
});

// ===== 获取商品分类 =====
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json({ categories: categories.filter(Boolean) });
  } catch (err) {
    res.status(500).json({ error: '获取分类失败' });
  }
});

// ===== 获取地图上的商品标记点 =====
router.get('/map/markers', async (req, res) => {
  try {
    const { swLng, swLat, neLng, neLat } = req.query;
    
    const query = { 
      status: { $ne: 'deleted' },
      'location.coordinates': { $exists: true }
    };

    if (swLng && neLng) {
      query['location.coordinates'] = {
        $geoWithin: {
          $box: [
            [parseFloat(swLng), parseFloat(swLat)],
            [parseFloat(neLng), parseFloat(neLat)]
          ]
        }
      };
    }

    const markers = await Product.find(query)
      .select('name price images location category supplierId')
      .lean();

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

module.exports = router;
