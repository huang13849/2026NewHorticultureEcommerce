/**
 * scenes — 庭院园林·成功案例 场景图代理
 * 转发到 ubuntu-master 上的 scene-service (3012, 经 Tailscale)。
 * 列表/增改删/换封面都走这里，前端保持同源 /api/scenes。
 */
const express = require('express');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const db = require('../lib/db');
const jwt = require('jsonwebtoken');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const SCENE_SERVICE = process.env.SCENE_SERVICE_URL || 'http://100.96.54.109:3012';
const SEO_SERVICE = process.env.SEO_SERVICE_URL || 'http://127.0.0.1:3011';
const PROXY_TIMEOUT = 15000;
const JWT_SECRET = process.env.JWT_SECRET || 'flower-shop-secret-2024';

const REGION_LABELS = {
  cn: { label: '国内版', market: '中文站 / 苏州站' },
  global: { label: '国际版', market: '国际站 / horiculture.space' },
};
const CATEGORY_EN = {
  '室内绿植': 'Indoor greenery', '鲜花': 'Fresh flowers', '主盆花': 'Potted flowers', '盆器': 'Planters',
  '乔灌木': 'Trees & shrubs', '种植盒': 'Grow boxes', '盆花': 'Potted blooms', '土': 'Soil & substrate',
  '宿根': 'Perennials', '兰花': 'Orchids', '百合': 'Lilies', '球根': 'Bulbs', '蝴蝶兰': 'Phalaenopsis',
  '种植设备': 'Growing equipment', '多肉': 'Succulents', '保鲜剂': 'Fresh-keeping', '盆景': 'Bonsai',
  '桌花': 'Table florals', '浇灌设备': 'Irrigation', '造型景观树': 'Sculptural landscape trees',
  '杜鹃花': 'Azaleas', '室内观叶绿植': 'Foliage plants', '花束': 'Bouquets', '地被草坪': 'Groundcover lawns', '绿植': 'Green plants',
};

function safeInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}
function authOptional(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET); }
  catch { return null; }
}
function requireSceneAdmin(req, res, next) {
  const decoded = authOptional(req);
  if (!decoded) return res.status(401).json({ error: '未登录' });
  if (!['admin', 'super_admin'].includes(decoded.role)) return res.status(403).json({ error: '需要管理员权限' });
  req.adminUser = decoded;
  return next();
}
function toCoverUrl(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  if (!s) return '';
  if (s.startsWith('http') || s.startsWith('/')) return s;
  return `/minio/supply-chain/${s.replace(/^\/+/, '')}`;
}
function pickProductImages(p) {
  const vals = [];
  for (const k of ['images', 'scene_images', 'panorama_images', 'detail_images', 'package_images', 'root_soil_images']) {
    const v = p?.[k];
    if (Array.isArray(v)) vals.push(...v);
    else if (typeof v === 'string' && v) vals.push(v);
  }
  return [...new Set(vals.map(toCoverUrl).filter(Boolean))];
}
function pickImage(p) {
  return pickProductImages(p)[0] || '';
}
function escRegex(s) { return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function titleForTag(tag, region) {
  if (region === 'global') return `${CATEGORY_EN[tag] || tag} garden scene`;
  return `${tag} · 庭院园林场景`;
}
function descForTag(tag, count, region) {
  if (region === 'global') return `Curated ${count} ${CATEGORY_EN[tag] || tag} SKUs for garden centers, landscape contractors and overseas buyers.`;
  return `聚合 ${count} 个「${tag}」商品，适合庭院园林、工程采购、门店陈列和内容种草。`;
}
function titleForTrend(t, region) {
  if (t.adTitle) return t.adTitle;
  return region === 'global' ? `${t.keyword} garden inspiration` : `${t.keyword} · SEO趋势场景`;
}
function descForTrend(t, region) {
  return t.summary || t.adCopy || (region === 'global'
    ? `Landing-page scene for the overseas trend keyword: ${t.keyword}.`
    : `围绕「${t.keyword}」生成的SEO落地页场景，可替换封面做内容投放。`);
}
function sceneKey(kind, region, keyword) { return `${kind}:${region}:${keyword}`.toLowerCase(); }
function normalizeScene(s) {
  return {
    id: s.id || s._id,
    region: s.region || 'all',
    kind: s.kind || 'product',
    keyword: s.keyword || s.tag || '',
    title: s.title || '',
    desc: s.desc || '',
    tag: s.tag || '',
    imageUrl: s.imageUrl || '',
    imageUrlAbsolute: s.imageUrlAbsolute || '',
    sortOrder: typeof s.sortOrder === 'number' ? s.sortOrder : Number(s.sortOrder || 0),
    enabled: s.enabled !== false,
    updatedAt: s.updatedAt || s.createdAt || '',
  };
}
async function fetchScenes(params = {}) {
  const r = await axios.get(`${SCENE_SERVICE}/api/scenes`, { params, timeout: PROXY_TIMEOUT });
  return Array.isArray(r.data?.scenes) ? r.data.scenes.map(normalizeScene) : [];
}
async function getProductTags(region) {
  const categories = await db.aggregate('products', [
    { $match: { status: { $ne: 'deleted' }, category: { $exists: true, $nin: ['', null] } } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 80 },
  ]).catch(() => []);

  const tags = [];
  for (const row of categories) {
    const tag = row._id;
    const products = await db.find('products', {
      filter: { status: { $ne: 'deleted' }, category: tag },
      sort: { salesCount: -1, updatedAt: -1, createdAt: -1 },
      limit: 1,
      fields: 'title,flowerName,images,scene_images,panorama_images,detail_images,package_images,category',
    }).catch(() => []);
    const first = products[0] || {};
    tags.push({
      sourceType: 'product-tag',
      kind: 'product',
      region,
      keyword: tag,
      tag,
      title: titleForTag(tag, region),
      desc: descForTag(tag, row.count || 0, region),
      imageUrl: pickImage(first),
      count: row.count || 0,
      route: `/shop?category=${encodeURIComponent(tag)}`,
    });
  }
  return tags;
}
async function getSeoTrends(region) {
  const r = await axios.get(`${SEO_SERVICE}/api/seo/trends`, { timeout: PROXY_TIMEOUT }).catch(() => ({ data: {} }));
  const list = region === 'global' ? (r.data?.overseas || []) : (r.data?.domestic || []);
  return list.map((t, i) => ({
    sourceType: 'seo-trend',
    kind: 'trend',
    region,
    keyword: t.keyword,
    tag: region === 'global' ? 'SEO Trend' : 'SEO趋势词',
    title: titleForTrend(t, region),
    desc: descForTrend(t, region),
    imageUrl: '',
    count: t.score || 0,
    score: t.score || 0,
    momentum: t.momentum || '',
    visualPrompt: t.visualPrompt || '',
    route: t.route || `/shop?keyword=${encodeURIComponent(t.keyword)}`,
    sortOrder: 1000 + i,
  }));
}
function attachManaged(base, managed) {
  const exact = new Map();
  for (const s of managed) {
    exact.set(sceneKey(s.kind, s.region, s.keyword || s.tag), s);
    if (s.region === 'all') exact.set(sceneKey(s.kind, 'cn', s.keyword || s.tag), s);
    if (s.region === 'all') exact.set(sceneKey(s.kind, 'global', s.keyword || s.tag), s);
  }
  return base.map((x, i) => {
    const s = exact.get(sceneKey(x.kind, x.region, x.keyword)) || null;
    return {
      ...x,
      sortOrder: s?.sortOrder ?? x.sortOrder ?? i,
      enabled: s?.enabled ?? true,
      managedId: s?.id || '',
      sceneId: s?.id || '',
      title: s?.title || x.title,
      desc: s?.desc || x.desc,
      tag: s?.tag || x.tag,
      imageUrl: s?.imageUrl || x.imageUrl,
      imageUrlAbsolute: s?.imageUrlAbsolute || '',
      hasCustomCover: !!s?.imageUrl,
      updatedAt: s?.updatedAt || '',
    };
  }).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}
function forwardBody(req) {
  const form = new FormData();
  Object.entries(req.body || {}).forEach(([k, v]) => {
    if (k === 'coverImageUrl') return;
    form.append(k, v == null ? '' : String(v));
  });
  if (req.body?.coverImageUrl && !req.body?.imageUrl) form.append('imageUrl', String(req.body.coverImageUrl));
  if (req.file) form.append('image', req.file.buffer, { filename: req.file.originalname || 'cover.jpg', contentType: req.file.mimetype || 'image/jpeg' });
  return form;
}


// GET /api/scenes/cover-images?keyword=rose&category=盆花
router.get('/cover-images', async (req, res) => {
  try {
    const { keyword = '', category = '', limit = 60 } = req.query;
    const filter = { status: { $ne: 'deleted' } };
    if (category) filter.category = category;
    if (keyword) {
      const rx = { $regex: escRegex(keyword), $options: 'i' };
      filter.$or = [{ title: rx }, { name: rx }, { flowerName: rx }, { category: rx }, { description: rx }];
    }
    let products = await db.find('products', {
      filter,
      sort: { salesCount: -1, updatedAt: -1, createdAt: -1 },
      limit: safeInt(limit, 60),
      fields: 'title,name,flowerName,category,images,scene_images,panorama_images,detail_images,package_images,root_soil_images',
    }).catch(() => []);
    if (!products.length && (keyword || category)) {
      products = await db.find('products', {
        filter: { status: { $ne: 'deleted' } },
        sort: { salesCount: -1, updatedAt: -1, createdAt: -1 },
        limit: safeInt(limit, 60),
        fields: 'title,name,flowerName,category,images,scene_images,panorama_images,detail_images,package_images,root_soil_images',
      }).catch(() => []);
    }
    const images = [];
    const seen = new Set();
    for (const p of products) {
      for (const url of pickProductImages(p)) {
        if (seen.has(url)) continue;
        seen.add(url);
        images.push({
          url,
          productId: p._id,
          title: p.title || p.name || p.flowerName || '商品图片',
          category: p.category || '',
        });
      }
    }
    res.json({ images, total: images.length });
  } catch (e) {
    console.error('[scenes/cover-images]', e.message);
    res.status(500).json({ error: 'cover image list failed', detail: e.message });
  }
});

// GET /api/scenes/catalog?region=cn|global|all
router.get('/catalog', async (req, res) => {
  try {
    const requested = req.query.region === 'global' ? 'global' : req.query.region === 'all' ? 'all' : 'cn';
    const regions = requested === 'all' ? ['cn', 'global'] : [requested];
    const managed = await fetchScenes({ region: requested === 'all' ? undefined : requested });
    const out = {};
    for (const region of regions) {
      const [productTags, seoTrends] = await Promise.all([getProductTags(region), getSeoTrends(region)]);
      out[region] = {
        ...REGION_LABELS[region],
        productTags: attachManaged(productTags, managed.filter(s => s.region === region || s.region === 'all')),
        seoTrends: attachManaged(seoTrends, managed.filter(s => s.region === region || s.region === 'all')),
      };
    }
    res.json({ regions: out, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error('[scenes/catalog]', e.message);
    res.status(500).json({ error: 'scene catalog failed', detail: e.message });
  }
});

// GET /api/scenes?region=cn|global&enabled=true&limit=6
router.get('/', async (req, res) => {
  try {
    const scenes = await fetchScenes(req.query);
    res.json({ scenes, total: scenes.length });
  } catch (e) {
    res.json({ scenes: [], total: 0 });
  }
});

router.post('/', requireSceneAdmin, upload.single('image'), async (req, res) => {
  try {
    const form = forwardBody(req);
    const r = await axios.post(`${SCENE_SERVICE}/api/scenes`, form, { headers: form.getHeaders(), timeout: PROXY_TIMEOUT, maxBodyLength: Infinity });
    res.status(r.status).json(normalizeScene(r.data));
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: 'scene create failed', detail: e.response?.data?.error || e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await axios.get(`${SCENE_SERVICE}/api/scenes/${req.params.id}`, { timeout: PROXY_TIMEOUT });
    res.json(normalizeScene(r.data));
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: 'scene fetch failed' });
  }
});

router.put('/:id', requireSceneAdmin, upload.single('image'), async (req, res) => {
  try {
    const form = forwardBody(req);
    const r = await axios.put(`${SCENE_SERVICE}/api/scenes/${req.params.id}`, form, { headers: form.getHeaders(), timeout: PROXY_TIMEOUT, maxBodyLength: Infinity });
    res.json(normalizeScene(r.data));
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: 'scene update failed', detail: e.response?.data?.error || e.message });
  }
});

router.delete('/:id', requireSceneAdmin, async (req, res) => {
  try {
    const r = await axios.delete(`${SCENE_SERVICE}/api/scenes/${req.params.id}`, { timeout: PROXY_TIMEOUT });
    res.status(r.status).json(r.data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: 'scene delete failed', detail: e.response?.data?.error || e.message });
  }
});

module.exports = router;
