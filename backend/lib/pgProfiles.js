// backend/lib/pgProfiles.js
// PG persistence for plant_collector.user_profiles + user_addresses.
// Same shape as pgOrders: primary/replica split, transactional writes.
'use strict';
const { Pool } = require('pg');

const WRITE_HOST = process.env.PG_HOST || '100.67.126.90';
const WRITE_PORT = parseInt(process.env.PG_PORT || '5432', 10);
const READ_HOSTS = (process.env.PG_READ_HOSTS || '100.127.141.83:5433')
  .split(',').map(s => s.trim()).filter(Boolean).map(hp => {
    const [h, p] = hp.split(':'); return { host: h, port: parseInt(p || '5432', 10) };
  });
const DB    = process.env.PG_DATABASE || 'supply_chain';
const USER  = process.env.PG_USER     || 'postgres';
const PWD   = process.env.PG_PASSWORD || '';

const writePool = new Pool({ host: WRITE_HOST, port: WRITE_PORT, database: DB, user: USER, password: PWD, max: 5 });
const readPools = READ_HOSTS.map(({host,port}) => new Pool({ host, port, database: DB, user: USER, password: PWD, max: 5 }));
let rrIdx = 0;
// Track read hosts that recently failed → skip them for 60s to avoid 500 on request
const readDeadUntil = new Array(readPools.length).fill(0);
function pickReadPool() {
  if (!readPools.length) return writePool;
  const now = Date.now();
  for (let i = 0; i < readPools.length; i++) {
    const idx = (rrIdx + i) % readPools.length;
    if (readDeadUntil[idx] <= now) {
      rrIdx = idx + 1;
      const p = readPools[idx];
      // Wrap query so ECONNREFUSED / network errors mark host dead + retry on writePool
      if (!p._wrapped) {
        const origQuery = p.query.bind(p);
        p.query = async (...args) => {
          try { return await origQuery(...args); }
          catch (e) {
            const msg = String(e && e.message || '');
            if (/ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|connect ENETUNREACH|Connection terminated/.test(msg)) {
              readDeadUntil[idx] = Date.now() + 60000;
              console.warn();
              return writePool.query(...args);
            }
            throw e;
          }
        };
        p._wrapped = true;
      }
      return p;
    }
  }
  // All read hosts dead → use write pool
  return writePool;
}

console.log(`[pgProfiles] write=${WRITE_HOST}:${WRITE_PORT}, read=${READ_HOSTS.map(r=>r.host+':'+r.port).join(',')||'(fallback→write)'}`);

// ----- OneID -----
// Format: U-YYYYMMDD-<SRC>-NNNN (per-day+source running counter)
async function nextOneId(client, sourceProject) {
  const src = (sourceProject || 'unk').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'UNK';
  const dt = new Date();
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth()+1).padStart(2,'0');
  const d = String(dt.getUTCDate()).padStart(2,'0');
  const datePart = `${y}${m}${d}`;
  const prefix = `U-${datePart}-${src}-`;
  const r = await client.query(
    `SELECT one_id FROM plant_collector.user_profiles
       WHERE one_id LIKE $1 ORDER BY one_id DESC LIMIT 1 FOR UPDATE`, [prefix + '%']);
  let n = 1;
  if (r.rows[0]) {
    const last = r.rows[0].one_id;
    const m2 = last.match(/-(\d+)$/);
    if (m2) n = parseInt(m2[1], 10) + 1;
  }
  return prefix + String(n).padStart(4, '0');
}

function rowToProfile(r) {
  if (!r) return null;
  return {
    _id: String(r.id),
    id: r.id,
    oneId: r.one_id,
    zid: r.zid,
    zitadelInstance: r.zitadel_instance || '',
    sourceProject: r.source_project,
    userType: r.user_type,
    brand: r.brand || '',
    loginName: r.login_name || '',
    nickname: r.nickname || '',
    realName: r.real_name || '',
    gender: r.gender || '',
    phone: r.phone || '',
    email: r.email || '',
    avatar: r.avatar_url || '',
    wechatOpenid: r.wechat_openid || '',
    wechatUnionid: r.wechat_unionid || '',
    orgId: r.org_id || '',
    tags: r.tags || [],
    preferences: r.preferences || {},
    gardenStats: r.garden_stats || {},
    metadata: r.metadata || {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    lastLoginAt: r.last_login_at,
    addresses: r.addresses || [],
    // legacy alias for old callers
    cart: (r.preferences && r.preferences.cart) || [],
  };
}
function rowToAddr(r) {
  if (!r) return null;
  return {
    id: r.addr_id, name: r.name || '', phone: r.phone || '',
    province: r.province || '', city: r.city || '', district: r.district || '',
    detail: r.detail || '', postalCode: r.postal_code || '',
    country: r.country || 'CN',
    latitude:  r.latitude  != null ? Number(r.latitude)  : null,
    longitude: r.longitude != null ? Number(r.longitude) : null,
    geoSource: r.geo_source || '',
    isDefault: !!r.is_default,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function getByZid(zid, opts) {
  if (!zid) return null;
  const rp = (opts && opts.preferPrimary) ? writePool : pickReadPool();
  const r = await rp.query('SELECT * FROM plant_collector.user_profiles WHERE zid=$1', [zid]);
  if (!r.rows[0]) return null;
  const p = rowToProfile(r.rows[0]);
  const a = await rp.query('SELECT * FROM plant_collector.user_addresses WHERE zid=$1 ORDER BY is_default DESC, created_at ASC', [zid]);
  p.addresses = a.rows.map(rowToAddr);
  return p;
}

async function getByLoginName(loginName) {
  if (!loginName) return null;
  const rp = pickReadPool();
  // Match by phone, email, or login_name column (whichever exists)
  const q = `SELECT * FROM plant_collector.user_profiles
             WHERE phone=$1 OR email=$1 OR login_name=$1 OR one_id=$1
             LIMIT 1`;
  try {
    const r = await rp.query(q, [loginName]);
    if (r.rows.length) return rowToProfile(r.rows[0]);
  } catch (e) {
    // column may not exist -> fallback to just phone/email
    try {
      const r2 = await rp.query('SELECT * FROM plant_collector.user_profiles WHERE phone=$1 OR email=$1 LIMIT 1', [loginName]);
      if (r2.rows.length) return rowToProfile(r2.rows[0]);
    } catch {}
  }
  return null;
}

async function getByOneId(oneId) {
  const rp = pickReadPool();
  const r = await rp.query('SELECT * FROM plant_collector.user_profiles WHERE one_id=$1', [oneId]);
  return rowToProfile(r.rows[0]);
}

async function upsertFromLogin(user) {
  if (!user || !user.zid) return null;
  const client = await writePool.connect();
  try {
    await client.query('BEGIN');
    const ex = await client.query('SELECT * FROM plant_collector.user_profiles WHERE zid=$1 FOR UPDATE', [user.zid]);
    if (ex.rows[0]) {
      // Only refresh auth-owned fields; never overwrite user edits.
      const upd = await client.query(
        `UPDATE plant_collector.user_profiles
            SET login_name = COALESCE(NULLIF($2,''), login_name),
                nickname   = COALESCE(NULLIF(nickname,''), $3),
                brand      = COALESCE(NULLIF(brand,''), $4),
                zitadel_instance = COALESCE(NULLIF(zitadel_instance,''), $5),
                last_login_at = now()
          WHERE zid=$1 RETURNING *`,
        [user.zid, user.loginName || '', user.nickname || '', user.brand || '', user.zitadelInstance || user.brand || '']
      );
      await client.query('COMMIT');
      return rowToProfile(upd.rows[0]);
    }
    // New user — derive source_project from brand:
    //   club  → shop-club
    //   us    → shop-space
    //   peony → peony-alliance
    //   *     → shop-club (fallback)
    const brand = user.brand || 'club';
    const sourceProject =
      user.sourceProject ||
      (brand === 'us' ? 'shop-space'
        : brand === 'peony' ? 'peony-alliance'
        : brand === 'club' ? 'shop-club' : ('shop-' + brand));
    const zInst = user.zitadelInstance || brand;
    const oneId = await nextOneId(client, sourceProject);
    const ins = await client.query(
      `INSERT INTO plant_collector.user_profiles
         (one_id, zid, zitadel_instance, source_project, user_type, brand,
          login_name, nickname, real_name, gender, phone, email, avatar_url,
          wechat_openid, org_id, tags, preferences, garden_stats, metadata, last_login_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19, now())
       RETURNING *`,
      [oneId, user.zid, zInst, sourceProject, user.userType || 'other', brand,
       user.loginName || '', user.nickname || user.loginName || '', user.realName || '',
       user.gender || '', user.phone || '', user.email || '', user.avatar || '',
       user.wechatOpenid || '', user.orgId || '', user.tags || [],
       user.preferences || {}, user.gardenStats || {}, user.metadata || {}]
    );
    await client.query('COMMIT');
    return rowToProfile(ins.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally { client.release(); }
}

const PATCHABLE = new Map([
  ['nickname',   { col: 'nickname',       transform: v => String(v || '') }],
  ['realName',   { col: 'real_name',      transform: v => String(v || '') }],
  ['phone',      { col: 'phone',          transform: v => String(v || '') }],
  ['email',      { col: 'email',          transform: v => String(v || '') }],
  ['gender',     { col: 'gender',         transform: v => String(v || '') }],
  ['avatar',     { col: 'avatar_url',     transform: v => String(v || '') }],
  ['tags',       { col: 'tags',           transform: v => Array.isArray(v) ? v.map(String) : [] }],
  ['preferences',{ col: 'preferences',    transform: v => v || {} , json: true }],
  ['userType',   { col: 'user_type',      transform: v => String(v || 'other') }],
  ['gardenStats',{ col: 'garden_stats',   transform: v => v || {} , json: true }],
  ['metadata',   { col: 'metadata',       transform: v => v || {} , json: true }],
]);

async function patchProfile(zid, body) {
  if (!zid) throw new Error('profile_not_found');
  const sets = []; const vals = [zid]; let i = 2;
  // cart lives inside preferences JSONB
  const b = { ...(body || {}) };
  if (Object.prototype.hasOwnProperty.call(b, 'cart')) {
    const existing = await getByZid(zid, { preferPrimary: true });
    if (!existing) throw new Error('profile_not_found');
    b.preferences = { ...(existing.preferences || {}), cart: Array.isArray(b.cart) ? b.cart : [] };
    delete b.cart;
  }
  for (const [k, v] of Object.entries(b)) {
    const meta = PATCHABLE.get(k); if (!meta) continue;
    const val = meta.transform(v);
    sets.push(`${meta.col} = $${i}${meta.json ? '::jsonb' : ''}`);
    vals.push(meta.json ? JSON.stringify(val) : val); i++;
  }
  if (!sets.length) return getByZid(zid);
  const r = await writePool.query(
    `UPDATE plant_collector.user_profiles SET ${sets.join(', ')} WHERE zid=$1 RETURNING *`, vals);
  if (!r.rows[0]) throw new Error('profile_not_found');
  return getByZid(zid, { preferPrimary: true });
}

// ---- Addresses ----
function newAddrId() {
  return 'a_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function listAddresses(zid, opts) {
  const pool = (opts && opts.preferPrimary) ? writePool : pickReadPool();
  const r = await pool.query('SELECT * FROM plant_collector.user_addresses WHERE zid=$1 ORDER BY is_default DESC, created_at ASC', [zid]);
  return r.rows.map(rowToAddr);
}

async function upsertAddress(zid, addr) {
  const client = await writePool.connect();
  try {
    await client.query('BEGIN');
    const prof = await client.query('SELECT 1 FROM plant_collector.user_profiles WHERE zid=$1', [zid]);
    if (!prof.rows[0]) throw new Error('profile_not_found');
    const id = addr.id || newAddrId();

    // Duplicate detection: same detail+province+city+district+phone → update in place
    let existId = null;
    const dup = await client.query(
      `SELECT addr_id FROM plant_collector.user_addresses
         WHERE zid=$1 AND detail=$2 AND province=$3 AND city=$4 AND district=$5 AND phone=$6 LIMIT 1`,
      [zid, addr.detail || '', addr.province || '', addr.city || '', addr.district || '', addr.phone || '']);
    if (dup.rows[0]) existId = dup.rows[0].addr_id;

    // If setting isDefault, first clear all others
    if (addr.isDefault) {
      await client.query('UPDATE plant_collector.user_addresses SET is_default=false WHERE zid=$1', [zid]);
    }
    // Auto-default when this is the only address
    const cnt = await client.query('SELECT count(*)::int AS c FROM plant_collector.user_addresses WHERE zid=$1', [zid]);
    const willBeDefault = addr.isDefault || cnt.rows[0].c === 0 || (existId && (await client.query(
      'SELECT is_default FROM plant_collector.user_addresses WHERE addr_id=$1', [existId])).rows[0]?.is_default);

    if (existId) {
      await client.query(
        `UPDATE plant_collector.user_addresses SET
            name=$3, phone=$4, province=$5, city=$6, district=$7, detail=$8,
            postal_code=$9, country=COALESCE($10, country),
            latitude=COALESCE($11, latitude), longitude=COALESCE($12, longitude), geo_source=COALESCE($13, geo_source),
            is_default=$14, metadata=COALESCE($15::jsonb, metadata)
          WHERE zid=$1 AND addr_id=$2`,
        [zid, existId, addr.name || '', addr.phone || '', addr.province || '', addr.city || '',
         addr.district || '', addr.detail || '', addr.postalCode || '', addr.country || null,
         addr.latitude != null ? addr.latitude : null,
         addr.longitude != null ? addr.longitude : null,
         addr.geoSource || null, !!willBeDefault,
         addr.metadata ? JSON.stringify(addr.metadata) : null]
      );
    } else {
      await client.query(
        `INSERT INTO plant_collector.user_addresses
           (addr_id, zid, name, phone, province, city, district, detail,
            postal_code, country, latitude, longitude, geo_source, is_default, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,'CN'),$11,$12,$13,$14,$15::jsonb)`,
        [id, zid, addr.name || '', addr.phone || '', addr.province || '', addr.city || '',
         addr.district || '', addr.detail || '', addr.postalCode || '', addr.country || null,
         addr.latitude != null ? addr.latitude : null,
         addr.longitude != null ? addr.longitude : null,
         addr.geoSource || null, !!willBeDefault,
         addr.metadata ? JSON.stringify(addr.metadata) : '{}']
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK'); throw e;
  } finally { client.release(); }
  return listAddresses(zid, { preferPrimary: true });
}

async function deleteAddress(zid, addrId) {
  const client = await writePool.connect();
  try {
    await client.query('BEGIN');
    const del = await client.query('DELETE FROM plant_collector.user_addresses WHERE zid=$1 AND addr_id=$2 RETURNING is_default', [zid, addrId]);
    if (del.rows[0] && del.rows[0].is_default) {
      // promote first remaining
      await client.query(`UPDATE plant_collector.user_addresses SET is_default=true
                           WHERE id = (SELECT id FROM plant_collector.user_addresses WHERE zid=$1
                                       ORDER BY created_at ASC LIMIT 1)`, [zid]);
    }
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  return listAddresses(zid);
}

async function setDefaultAddress(zid, addrId) {
  const client = await writePool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE plant_collector.user_addresses SET is_default=false WHERE zid=$1', [zid]);
    await client.query('UPDATE plant_collector.user_addresses SET is_default=true WHERE zid=$1 AND addr_id=$2', [zid, addrId]);
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  return listAddresses(zid);
}

async function setAddressGeo(zid, addrId, { latitude, longitude, geoSource }) {
  await writePool.query(
    `UPDATE plant_collector.user_addresses
       SET latitude=$3, longitude=$4, geo_source=COALESCE($5, geo_source)
     WHERE zid=$1 AND addr_id=$2`,
    [zid, addrId, latitude != null ? latitude : null, longitude != null ? longitude : null, geoSource || null]
  );
  return listAddresses(zid, { preferPrimary: true });
}

module.exports = {
  getByZid, getByOneId, getByLoginName, upsertFromLogin, patchProfile,
  listAddresses, upsertAddress, deleteAddress, setDefaultAddress, setAddressGeo,
  _writePool: writePool,
};
