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

module.exports = router;
