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

module.exports = router;
