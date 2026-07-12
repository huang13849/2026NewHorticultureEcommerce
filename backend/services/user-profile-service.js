// backend/services/user-profile-service.js
// Unified Mongo user profile keyed by Zitadel user id (zid).
// Zitadel keeps auth basics (loginName/email/phone). Everything else lives here:
//   { zid, brand, loginName, nickname, phone, email, gender, tags[],
//     addresses[], preferences{}, gardenStats{}, createdAt, updatedAt }
'use strict';

const db = require('../lib/db');
const COL = 'user_profiles';

// db.find returns an array (rewriteImages), NOT {data:[]}. Handle both shapes to be safe.
function firstOf(res) {
  if (!res) return null;
  if (Array.isArray(res)) return res[0] || null;
  if (Array.isArray(res.data)) return res.data[0] || null;
  return null;
}

async function getByZid(zid) {
  if (!zid) return null;
  const res = await db.find(COL, { filter: { zid }, limit: 1 });
  return firstOf(res);
}

async function upsertFromLogin(user) {
  // called by login-service right after Zitadel session verified
  // user = { zid, loginName, nickname, orgId, brand }
  if (!user || !user.zid) return null;
  const existing = await getByZid(user.zid);
  const now = new Date().toISOString();
  if (existing) {
    // Only refresh non-user-owned fields (auth identity), never overwrite profile edits.
    const patch = {
      loginName: user.loginName || existing.loginName,
      brand: existing.brand || user.brand,
      lastLoginAt: now,
      updatedAt: now,
    };
    if (!existing.nickname && user.nickname) patch.nickname = user.nickname;
    await db.update(COL, existing._id, patch);
    return { ...existing, ...patch };
  }
  const doc = {
    zid: user.zid,
    brand: user.brand || 'club',
    loginName: user.loginName || '',
    nickname: user.nickname || user.loginName || '',
    orgId: user.orgId || '',
    phone: '',
    email: '',
    gender: '', // 'male' | 'female' | 'other' | ''
    tags: [],   // e.g. ['vip', 'wholesale']
    addresses: [],
    preferences: {},
    gardenStats: { totalPlanted: 0, totalCompleted: 0, totalGifted: 0 },
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };
  const created = await db.create(COL, doc);
  return created && created._id ? created : { ...doc, ...(created || {}) };
}

// Whitelist patch — never let clients change zid/brand/orgId via PATCH
const PATCHABLE = new Set(['nickname', 'phone', 'email', 'gender', 'tags', 'preferences', 'avatar']);
async function patchProfile(zid, body) {
  const existing = await getByZid(zid);
  if (!existing) throw new Error('profile_not_found');
  const patch = { updatedAt: new Date().toISOString() };
  for (const k of Object.keys(body || {})) {
    if (PATCHABLE.has(k)) patch[k] = body[k];
  }
  await db.update(COL, existing._id, patch);
  return { ...existing, ...patch };
}

// ---- Addresses ----
async function listAddresses(zid) {
  const doc = await getByZid(zid);
  return (doc && doc.addresses) || [];
}

function newAddrId() {
  return 'a_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function upsertAddress(zid, addr) {
  const doc = await getByZid(zid);
  if (!doc) throw new Error('profile_not_found');
  let list = Array.isArray(doc.addresses) ? doc.addresses.slice() : [];
  const idx = list.findIndex(a =>
    a.detail === addr.detail && a.province === addr.province &&
    a.city === addr.city && a.district === addr.district && a.phone === addr.phone
  );
  const now = new Date().toISOString();
  const merged = {
    id: addr.id || newAddrId(),
    name: addr.name, phone: addr.phone,
    province: addr.province, city: addr.city, district: addr.district, detail: addr.detail,
    isDefault: !!addr.isDefault,
    createdAt: now,
  };
  if (idx >= 0) {
    merged.id = list[idx].id || merged.id;
    merged.createdAt = list[idx].createdAt || now;
    list[idx] = { ...list[idx], ...merged };
  } else {
    if (list.length === 0) merged.isDefault = true;
    list.push(merged);
  }
  if (merged.isDefault) list = list.map(a => ({ ...a, isDefault: a.id === merged.id }));
  await db.update(COL, doc._id, { addresses: list, updatedAt: now });
  return list;
}

async function deleteAddress(zid, id) {
  const doc = await getByZid(zid);
  if (!doc) return [];
  const list = (doc.addresses || []).filter(a => a.id !== id);
  // If we removed the default, promote first remaining
  if (list.length && !list.some(a => a.isDefault)) list[0].isDefault = true;
  await db.update(COL, doc._id, { addresses: list, updatedAt: new Date().toISOString() });
  return list;
}

async function setDefaultAddress(zid, id) {
  const doc = await getByZid(zid);
  if (!doc) return [];
  const list = (doc.addresses || []).map(a => ({ ...a, isDefault: a.id === id }));
  await db.update(COL, doc._id, { addresses: list, updatedAt: new Date().toISOString() });
  return list;
}

module.exports = {
  getByZid,
  upsertFromLogin,
  patchProfile,
  listAddresses,
  upsertAddress,
  deleteAddress,
  setDefaultAddress,
  COL,
};
