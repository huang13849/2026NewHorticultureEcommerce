// backend/routes/user.js
// Mounted at /api/user. New sid-cookie auth path — legacy /api/auth/* is stolen by nginx -> flower-next (NextAuth).
'use strict';

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'flower-shop-secret-2024';
const loginService = require('../services/login-service');
const userProfileService = require('../services/user-profile-service');

async function currentUser(req) {
  try {
    const s = await loginService.readSession(req);
    if (s && s.user && s.user.zid) return s.user;
  } catch (_) {}
  const auth = req.headers.authorization;
  if (auth) {
    try {
      const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
      if (decoded && decoded.zid) return { zid: decoded.zid, phone: decoded.phone, nickname: decoded.nickname, brand: decoded.brand };
    } catch (_) {}
  }
  // [user] flower_token cookie fallback（跨域 SSO 场景 sid 常缺）
  try {
    const cookieHdr = req.headers.cookie || '';
    const m = /(?:^|;\s*)flower_token=([^;]+)/.exec(cookieHdr);
    if (m) {
      const tok = decodeURIComponent(m[1]);
      const decoded = jwt.verify(tok, JWT_SECRET);
      if (decoded && decoded.zid) return { zid: decoded.zid, phone: decoded.phone, nickname: decoded.nickname, brand: decoded.brand };
    }
  } catch (_) {}
  return null;
}
async function requireUser(req, res) {
  const u = await currentUser(req);
  if (!u) { res.status(401).json({ error: 'unauthenticated' }); return null; }
  return u;
}

router.get('/profile', async (req, res) => {
  const u = await requireUser(req, res); if (!u) return;
  try {
    let profile = await userProfileService.getByZid(u.zid);
    if (!profile) profile = await userProfileService.upsertFromLogin(u);
    res.json({ profile });
  } catch (e) { console.error('[GET /user/profile]', e.message); res.status(500).json({ error: 'db_error', detail: e.message }); }
});

router.patch('/profile', async (req, res) => {
  const u = await requireUser(req, res); if (!u) return;
  try {
    const profile = await userProfileService.patchProfile(u.zid, req.body || {});
    res.json({ profile });
  } catch (e) { console.error('[PATCH /user/profile]', e.message); res.status(e.message === 'profile_not_found' ? 404 : 500).json({ error: e.message }); }
});

router.get('/address', async (req, res) => {
  const u = await requireUser(req, res); if (!u) return;
  try {
    let profile = await userProfileService.getByZid(u.zid);
    if (!profile) profile = await userProfileService.upsertFromLogin(u);
    res.json({ address: (profile && profile.addresses) || [] });
  } catch (e) { console.error('[GET /user/address]', e.message); res.status(500).json({ error: 'db_error', detail: e.message }); }
});

router.put('/address', async (req, res) => {
  const u = await requireUser(req, res); if (!u) return;
  try {
    const b = req.body || {};
    for (const k of ['name','phone','province','city','district','detail']) {
      if (!String(b[k] || '').trim()) return res.status(400).json({ error: 'missing_field', field: k });
    }
    let profile = await userProfileService.getByZid(u.zid);
    if (!profile) profile = await userProfileService.upsertFromLogin(u);
    const list = await userProfileService.upsertAddress(u.zid, {
      name: b.name, phone: b.phone,
      province: b.province, city: b.city, district: b.district, detail: b.detail,
      postalCode: b.postalCode || '', country: b.country || 'CN',
      latitude:  (b.latitude  != null && b.latitude  !== '') ? Number(b.latitude)  : null,
      longitude: (b.longitude != null && b.longitude !== '') ? Number(b.longitude) : null,
      geoSource: b.geoSource || (b.latitude != null && b.latitude !== '' ? 'manual' : null),
      isDefault: !!b.isDefault, id: b.id,
    });
    res.json({ message: 'address_updated', address: list });
  } catch (e) { console.error('[PUT /user/address]', e.message); res.status(500).json({ error: 'db_error', detail: e.message }); }
});

router.delete('/address/:id', async (req, res) => {
  const u = await requireUser(req, res); if (!u) return;
  try {
    const list = await userProfileService.deleteAddress(u.zid, req.params.id);
    res.json({ message: 'address_deleted', address: list });
  } catch (e) { console.error('[DELETE /user/address]', e.message); res.status(500).json({ error: 'db_error', detail: e.message }); }
});

router.post('/address/:id/default', async (req, res) => {
  const u = await requireUser(req, res); if (!u) return;
  try {
    const list = await userProfileService.setDefaultAddress(u.zid, req.params.id);
    res.json({ message: 'default_set', address: list });
  } catch (e) { console.error('[POST /user/address/:id/default]', e.message); res.status(500).json({ error: 'db_error', detail: e.message }); }
});

// PATCH /user/address/:id/geo — manually attach lat/lng (client can geocode via OSM in-browser)
router.patch('/address/:id/geo', async (req, res) => {
  const u = await requireUser(req, res); if (!u) return;
  try {
    const b = req.body || {};
    if (b.latitude == null || b.longitude == null) return res.status(400).json({ error: 'missing_lat_lng' });
    const lat = Number(b.latitude), lng = Number(b.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ error: 'invalid_lat_lng' });
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180)    return res.status(400).json({ error: 'out_of_range' });
    const list = await userProfileService.setAddressGeo(u.zid, req.params.id, {
      latitude: lat, longitude: lng, geoSource: b.geoSource || 'manual',
    });
    res.json({ message: 'geo_updated', address: list });
  } catch (e) { console.error('[PATCH /user/address/:id/geo]', e.message); res.status(500).json({ error: 'db_error', detail: e.message }); }
});


// GET /user/orders — 按登录用户 (zid) 拉取订单
router.get('/orders', async (req, res) => {
  const u = await requireUser(req, res); if (!u) return;
  try {
    const pgOrders = require('../lib/pgOrders');
    const rows = await pgOrders.listByUser(u.zid, { limit: 200 });
    const orders = rows.map(r => {
      const meta = r.metadata || {};
      const addr = r.shipping_address || {};
      return {
        _id: r.id, orderId: r.order_no, zid: r.zid, status: r.status,
        subtotal: Number(r.subtotal), shippingFee: Number(r.shipping_fee),
        couponDiscount: Number(r.discount), totalAmount: Number(r.total),
        currency: r.currency, payMethod: meta.pay_method || '',
        provider: meta.provider || '', brand: meta.brand || '',
        region: meta.region || '',
        stripeSessionId: meta.stripe_session_id || '', checkoutUrl: meta.checkout_url || '',
        memberName: addr.memberName || '', phone: addr.phone || '',
        deliveryAddress: addr.text || '',
        items: (r.items || []).map(it => ({
          productId: it.sku_id, name: it.title, price: Number(it.unit_price),
          quantity: it.qty, ...(it.snapshot || {}),
        })),
        createdAt: r.created_at, paidAt: r.paid_at,
      };
    });
    const filtered = req.query.region ? orders.filter(o => o.region === req.query.region) : orders;
    res.json({ orders: filtered, total: filtered.length });
  } catch (e) { console.error('[GET /user/orders]', e.message); res.status(500).json({ error: 'db_error', detail: e.message }); }
});


// DELETE /user/orders/:orderId — 删除订单 (只能删自己名下的)
router.delete('/orders/:orderId', async (req, res) => {
  const u = await requireUser(req, res); if (!u) return;
  try {
    const pgOrders = require('../lib/pgOrders');
    const { orderId } = req.params;
    const pgOrder = await pgOrders.findByOrderNo(orderId);
    if (!pgOrder) return res.status(404).json({ error: 'order_not_found_or_not_yours' });
    if (pgOrder.zid !== u.zid) return res.status(404).json({ error: 'order_not_found_or_not_yours' });
    const upd = await pgOrders.updateOrderStatus(pgOrder.order_no, { status: 'cancelled', cancelledAt: new Date().toISOString() });
    res.json({ ok: true, deletedId: upd ? upd.id : pgOrder.id, orderId });
  } catch (e) {
    console.error('[DELETE /user/orders]', e.message);
    res.status(500).json({ error: 'db_error', detail: e.message });
  }
});

// GET /user/cart — 服务端购物车 (persistent, per-zid)
router.get('/cart', async (req, res) => {
  const u = await requireUser(req, res); if (!u) return;
  try {
    const profile = await userProfileService.getByZid(u.zid);
    res.json({ cart: (profile && profile.cart) || [] });
  } catch (e) { res.status(500).json({ error: 'db_error', detail: e.message }); }
});

// PUT /user/cart — 覆盖式保存购物车
router.put('/cart', async (req, res) => {
  const u = await requireUser(req, res); if (!u) return;
  try {
    const cart = Array.isArray(req.body.cart) ? req.body.cart : [];
    await userProfileService.patchProfile(u.zid, { cart });
    res.json({ ok: true, cart });
  } catch (e) { res.status(500).json({ error: 'db_error', detail: e.message }); }
});



// -----------------------------------------------------------------------------
// INTERNAL: cross-service upsert
// Called by peony-alliance/mobile-auth-service after Zitadel register to make
// sure the OneID + PG profile row exists.
// Auth: X-API-Key header must match INTERNAL_API_KEY (fallback: ***REMOVED_API_KEY***).
// -----------------------------------------------------------------------------
router.post('/_internal/upsert-profile', async (req, res) => {
  const expected = process.env.INTERNAL_API_KEY || '***REMOVED_API_KEY***';
  if (req.headers['x-api-key'] !== expected) return res.status(401).json({ error: 'bad_key' });
  const b = req.body || {};
  if (!b.zid) return res.status(400).json({ error: 'missing_zid' });
  try {
    const created = await userProfileService.upsertFromLogin({
      zid: b.zid,
      loginName: b.loginName || b.phone || '',
      nickname:  b.nickname || '',
      orgId:     b.orgId || '',
      brand:     b.brand || 'peony',
      zitadelInstance: b.zitadelInstance || b.brand || 'peony',
      sourceProject:   b.sourceProject   || 'peony-alliance',
      userType:  b.userType   || 'peony_wholesaler',
      phone:     b.phone      || '',
      email:     b.email      || '',
      gender:    b.gender     || '',
      realName:  b.realName   || '',
      tags:      Array.isArray(b.tags) ? b.tags : [],
      metadata:  b.metadata   || {},
    });
    // Additional whitelist fields
    if (b.gender || b.realName || b.tags) {
      await userProfileService.patchProfile(b.zid, {
        ...(b.gender ? { gender: b.gender } : {}),
        ...(b.realName ? { realName: b.realName } : {}),
        ...(Array.isArray(b.tags) && b.tags.length ? { tags: b.tags } : {}),
      });
    }
    res.json({ ok: true, profile: created });
  } catch (e) {
    console.error('[POST /user/_internal/upsert-profile]', e.message);
    res.status(500).json({ error: 'db_error', detail: e.message });
  }
});

module.exports = router;
