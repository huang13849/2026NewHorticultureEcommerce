const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../lib/db');

function normalizeKeyword(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 80);
}

function ipHash(req) {
  const raw = String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0];
  return raw ? crypto.createHash('sha256').update(raw).digest('hex').slice(0, 24) : '';
}

async function searchProducts(keyword, limit = 24) {
  const filter = { status: { $ne: 'deleted' }, stock: { $gt: 0 } };
  if (keyword) {
    filter.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { title: { $regex: keyword, $options: 'i' } },
      { flowerName: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } },
      { category: { $regex: keyword, $options: 'i' } },
    ];
  }
  const products = await db.find('products', {
    filter,
    sort: { salesCount: -1, createdAt: -1 },
    page: 1,
    limit: Math.min(Math.max(parseInt(limit) || 24, 1), 80),
  });
  const total = await db.count('products', filter).catch(() => products.length);
  return { products, total };
}

router.get('/products', async (req, res) => {
  try {
    const keyword = normalizeKeyword(req.query.keyword);
    if (!keyword) return res.json({ products: [], total: 0, keyword: '' });
    const data = await searchProducts(keyword, req.query.limit);
    res.json({ ...data, keyword });
  } catch (err) {
    console.error('Product search error:', err);
    res.status(500).json({ error: '商品搜索失败' });
  }
});

router.post('/products', async (req, res) => {
  try {
    const keyword = normalizeKeyword(req.body.keyword);
    if (!keyword) return res.status(400).json({ error: '关键词不能为空' });
    const data = await searchProducts(keyword, req.body.limit);

    const log = {
      keyword,
      normalized_keyword: keyword.toLowerCase(),
      result_count: data.total || data.products.length,
      region_code: String(req.body.regionCode || '').slice(0, 16) || null,
      lang: String(req.body.lang || '').slice(0, 16) || null,
      source: String(req.body.source || 'home').slice(0, 32),
      user_id: req.body.userId ? String(req.body.userId).slice(0, 120) : null,
      user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
      ip_hash: ipHash(req),
      path: String(req.body.path || '').slice(0, 300) || null,
    };
    db.pgInsert('supply_chain', 'product_search_logs', log).catch(e => console.warn('search log write failed:', e.message));

    res.json({ ...data, keyword, logged: true });
  } catch (err) {
    console.error('Product search+log error:', err);
    res.status(500).json({ error: '商品搜索失败' });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1');
    const limit = Math.min(parseInt(req.query.limit || '100'), 500);
    const result = await db.pgFind('supply_chain', 'product_search_logs', {
      sort: '-created_at',
      page,
      limit,
      readFrom: 'standby',
    });
    res.json({ logs: result.data || [], total: result.total || 0, page, limit });
  } catch (err) {
    console.error('Search logs error:', err);
    res.status(500).json({ error: '获取搜索记录失败' });
  }
});

module.exports = router;
