
// backfill Mongo user_profiles → PG. Idempotent: PG UNIQUE(zid) skips existing.
const axios = require('axios');
const pg = require('./lib/pgProfiles');
const GATEWAY = process.env.API_GATEWAY_URL || 'http://api-gateway.supply-chain.svc.cluster.local:3007';
const KEY = process.env.API_KEY || '***REMOVED_API_KEY***';
const client = axios.create({ timeout: 30000, headers: { 'X-API-Key': KEY } });

(async () => {
  const url = `${GATEWAY}/api/mongo/user_profiles?filter=${encodeURIComponent('{}')}&limit=1000`;
  const resp = await client.get(url);
  const list = Array.isArray(resp.data) ? resp.data : (resp.data.data || resp.data.results || resp.data.items || []);
  console.log('mongo_total', list.length);
  let ins=0, patched=0, skip=0, err=0;
  for (const m of list) {
    if (!m.zid) { skip++; continue; }
    try {
      const prof = await pg.upsertFromLogin({
        zid: m.zid,
        loginName: m.loginName || '',
        nickname:  m.nickname  || '',
        orgId:     m.orgId     || '',
        brand:     m.brand     || 'club',
        zitadelInstance: m.brand || 'club',
        sourceProject: m.sourceProject || (m.brand === 'us' ? 'shop-space' : m.brand === 'peony' ? 'peony-alliance' : 'shop-club'),
        userType:  m.userType  || 'other',
        phone:     m.phone     || '',
        email:     m.email     || '',
        gender:    m.gender    || '',
        tags:      Array.isArray(m.tags) ? m.tags : [],
        preferences: { ...(m.preferences || {}), cart: Array.isArray(m.cart) ? m.cart : (m.preferences && m.preferences.cart) || [] },
        gardenStats: m.gardenStats || {},
        metadata: { legacy_mongo_id: m._id ? String(m._id) : '' },
      });
      ins++;
      // Extra patch: gender/tags/prefs may have been ignored on existing rows (upsert only touches auth fields)
      const upd = {};
      if (m.gender)       upd.gender = m.gender;
      if (Array.isArray(m.tags) && m.tags.length) upd.tags = m.tags;
      if (Array.isArray(m.cart) && m.cart.length) upd.cart = m.cart;
      if (Object.keys(upd).length) { await pg.patchProfile(m.zid, upd); patched++; }
      // Addresses
      for (const a of (m.addresses || [])) {
        await pg.upsertAddress(m.zid, {
          id: a.id, name: a.name, phone: a.phone,
          province: a.province, city: a.city, district: a.district, detail: a.detail,
          isDefault: !!a.isDefault,
          latitude: a.latitude != null ? Number(a.latitude) : null,
          longitude: a.longitude != null ? Number(a.longitude) : null,
          geoSource: a.geoSource || null,
        });
      }
    } catch (e) { err++; console.error('err', m.zid, e.message); }
  }
  console.log(JSON.stringify({ mongo_total: list.length, upserted: ins, patched, skipped_no_zid: skip, errors: err }));
  await pg._writePool.end();
})().catch(e => { console.error(e); process.exit(1); });
