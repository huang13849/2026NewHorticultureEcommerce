/**
 * flower-api 认证路由 —  Zitadel OIDC-only 版本 (2026-07-05)
 *
 * 政策变更:
 *   - 停用手机号+验证码 / 密码 / sso-issue (phone→token) 等自查库路径
 *   - 只提供两个端点:
 *       POST /auth/sso-callback  { id_token }  -> 验签 -> 签 flower_token
 *       GET  /auth/me                          -> 直接从 flower_token 解出身份
 *   - 认证与用户身份的 唯一来源是 Zitadel:
 *       zid  = id_token.sub          (Zitadel user id, 稳定)
 *       phone = id_token.phone_number 或 preferred_username 前缀
 *       role = 从 id_token.urn:zitadel:iam:org:project:roles 读, 没有默认 user
 *   - 业务数据 (address / location) 端点先返回 501, 后续按 zid 迁到 Mongo
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const axios = require('axios');

const JWT_SECRET = process.env.JWT_SECRET || 'flower-shop-secret-2024';

// ===== Zitadel OIDC 配置 =====
const ZITADEL_ISSUER = process.env.ZITADEL_ISSUER || 'https://id.horiculture.club';
const ZITADEL_JWKS_URI = process.env.ZITADEL_JWKS_URI || `${ZITADEL_ISSUER}/oauth/v2/keys`;
// 允许两个 audience: club-web 和 space-web (二者共用一个后端)
const CLUB_WEB_CLIENT_ID = process.env.ZITADEL_CLUB_WEB_CLIENT_ID || '380222397556523217';
const SPACE_WEB_CLIENT_ID = process.env.ZITADEL_SPACE_WEB_CLIENT_ID || '380222566284984529';
const ALLOWED_AUDIENCES = [CLUB_WEB_CLIENT_ID, SPACE_WEB_CLIENT_ID].filter(Boolean);

// 项目 roles claim key
const ROLES_CLAIM = 'urn:zitadel:iam:org:project:roles';

// JWKS 缓存 (10 分钟)
let jwksCache = { keys: null, fetchedAt: 0 };
const JWKS_TTL_MS = 10 * 60 * 1000;

async function getJwks() {
  if (jwksCache.keys && (Date.now() - jwksCache.fetchedAt) < JWKS_TTL_MS) return jwksCache.keys;
  const resp = await axios.get(ZITADEL_JWKS_URI, { timeout: 5000 });
  jwksCache = { keys: resp.data.keys, fetchedAt: Date.now() };
  return jwksCache.keys;
}

async function verifyZitadelIdToken(idToken) {
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded) throw new Error('id_token 解析失败');
  const kid = decoded.header.kid;
  const keys = await getJwks();
  const jwk = keys.find(k => k.kid === kid);
  if (!jwk) throw new Error(`JWKS 找不到 kid=${kid}`);
  const pem = jwkToPem(jwk);
  return jwt.verify(idToken, pem, {
    algorithms: ['RS256'],
    issuer: ZITADEL_ISSUER,
    audience: ALLOWED_AUDIENCES,
  });
}

function rolesFromClaims(claims) {
  // Zitadel roles claim shape: { "urn:zitadel:iam:org:project:roles": { "admin": {"orgId":"..."}, "buyer": {...} } }
  const raw = claims[ROLES_CLAIM];
  if (!raw || typeof raw !== 'object') return [];
  return Object.keys(raw);
}

function phoneFromClaims(claims) {
  if (claims.phone_number) return String(claims.phone_number);
  const pu = String(claims.preferred_username || '');
  const m = pu.match(/^(1\d{10})(?=@|$)/);
  return m ? m[1] : '';
}

// ============================================================================
// POST /auth/sso-callback   { id_token }
// ============================================================================
router.post('/sso-callback', async (req, res) => {
  try {
    const { id_token } = req.body || {};
    if (!id_token) return res.status(400).json({ error: 'id_token required' });

    const claims = await verifyZitadelIdToken(id_token);
    const zid = claims.sub;
    const phone = phoneFromClaims(claims);
    const email = claims.email || '';
    const nickname = claims.name || claims.given_name || claims.preferred_username || (phone ? `花友${phone.slice(-4)}` : '花友');
    const roles = rolesFromClaims(claims);

    // 角色优先级: admin > dealer > supplier:* > buyer > user
    const isAdmin = roles.includes('admin');
    const isSuperAdmin = isAdmin;      // 目前 admin 即 super_admin (Zitadel 侧只有一档管理员)
    const primaryRole = isAdmin ? 'super_admin'
                      : roles.includes('dealer') ? 'dealer'
                      : (roles.find(r => r.startsWith('supplier:')) || '')
                        || (roles.includes('buyer') ? 'user' : 'user');

    const flowerToken = jwt.sign(
      {
        zid,
        phone,
        email,
        nickname,
        role: primaryRole,
        roles,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      token: flowerToken,
      user: {
        id: zid,               // 现在 id = Zitadel sub, 不再是 mongo _id
        phone,
        email,
        nickname: isAdmin ? '超级管理员' : nickname,
        avatar: isAdmin ? '👑' : '',
        role: primaryRole,
        roles,
        isAdmin,
        isSuperAdmin,
        address: [],           // 业务数据后续按 zid 迁, 现在返回空
      },
    });
  } catch (err) {
    console.error('[sso-callback]', err.message);
    return res.status(401).json({ error: 'sso_verify_failed', detail: err.message });
  }
});

// helper: parse Cookie header (no cookie-parser dep)
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(/;\s*/).forEach(p => {
    const i = p.indexOf('=');
    if (i < 0) return;
    const k = p.slice(0, i).trim();
    const v = p.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function shapeUser(decoded) {
  const isAdmin = decoded.role === 'super_admin' || decoded.role === 'admin';
  return {
    id: decoded.zid,
    phone: decoded.phone,
    email: decoded.email,
    nickname: isAdmin ? '超级管理员' : (decoded.nickname || ''),
    avatar: isAdmin ? '👑' : '',
    role: decoded.role || 'user',
    roles: decoded.roles || [],
    isAdmin,
    isSuperAdmin: isAdmin,
    address: [],
  };
}

// ============================================================================
// GET /auth/me   —— 直接从 flower_token 解, 不查库
// ============================================================================
router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'unauthenticated' });
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const isAdmin = decoded.role === 'super_admin' || decoded.role === 'admin';
    // 从 Mongo flower_user_addresses 拉地址列表 (静默失败, 不阻塞登录)
    let address = [];
    try {
      const dbLib = require('../lib/db');
      const list = await dbLib.find('flower_user_addresses', { filter: { zid: decoded.zid }, limit: 1 });
      const doc = list && list.data ? list.data[0] : (Array.isArray(list) ? list[0] : null);
      if (doc && Array.isArray(doc.addresses)) address = doc.addresses;
    } catch (e) { /* silent */ }
    return res.json({
      id: decoded.zid,
      phone: decoded.phone,
      email: decoded.email,
      nickname: isAdmin ? '超级管理员' : (decoded.nickname || ''),
      avatar: isAdmin ? '👑' : '',
      role: decoded.role || 'user',
      roles: decoded.roles || [],
      isAdmin,
      isSuperAdmin: isAdmin,
      address,
    });
  } catch (err) {
    return res.status(401).json({ error: 'token_invalid' });
  }
});

// GET /auth/me-flower  —— 从 .horiculture.club/.horiculture.space 的 flower_token cookie 解
//   跨站 SSO 兜底: 主站 next-app 挂载时 fetch 这个端点, 拿到用户就当已登录。
router.get('/me-flower', (req, res) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const authH = req.headers.authorization;
    const bearer = authH ? authH.replace('Bearer ', '') : null;
    const tok = cookies.flower_token || bearer;
    if (!tok) return res.status(401).json({ error: 'no_flower_token' });
    const decoded = jwt.verify(tok, JWT_SECRET);
    return res.json({ user: shapeUser(decoded) });
  } catch (err) {
    return res.status(401).json({ error: 'flower_token_invalid', detail: err.message });
  }
});

// ============================================================================
// 已弃用 —— 手机号 / 验证码 / 密码 / sso-issue (phone→token)
// ============================================================================
const goneHandler = (req, res) => {
  return res.status(410).json({ error: 'endpoint_deprecated', hint: '统一走 Zitadel OIDC. 前往 /login 单点登录' });
};
router.post('/login', goneHandler);
router.post('/send-code', goneHandler);
router.post('/set-password', goneHandler);
router.post('/sso-issue', goneHandler);

// ============================================================================
// 业务数据端点 —— 先占位, 后续按 zid 重接 Mongo
// ============================================================================
router.put('/location', (req, res) => res.status(501).json({ error: 'not_implemented', note: 'awaiting zid-based reimpl' }));

// ============================================================================
// /auth/address — 收货地址 CRUD (按 zid 存 Mongo flower_user_addresses)
// ============================================================================
const db = require('../lib/db');

function requireZid(req, res) {
  const auth = req.headers.authorization;
  if (!auth) { res.status(401).json({ error: 'unauthenticated' }); return null; }
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    return { zid: decoded.zid, phone: decoded.phone, nickname: decoded.nickname };
  } catch (e) {
    res.status(401).json({ error: 'token_invalid' });
    return null;
  }
}

async function getUserDoc(zid) {
  const list = await db.find('flower_user_addresses', { filter: { zid }, limit: 1 });
  return (list && list.data ? list.data[0] : (Array.isArray(list) ? list[0] : null)) || null;
}

// GET /auth/address — 列出全部地址
router.get('/address', async (req, res) => {
  const u = requireZid(req, res); if (!u) return;
  try {
    const doc = await getUserDoc(u.zid);
    res.json({ address: (doc && doc.addresses) || [] });
  } catch (e) {
    console.error('[GET /auth/address]', e.message);
    res.status(500).json({ error: 'db_error', detail: e.message });
  }
});

// PUT /auth/address — 新增/更新一条地址; isDefault=true 则自动清其他 default
router.put('/address', async (req, res) => {
  const u = requireZid(req, res); if (!u) return;
  try {
    const { name, phone, province, city, district, detail, isDefault } = req.body || {};
    for (const k of ['name','phone','province','city','district','detail']) {
      if (!String((req.body||{})[k] || '').trim()) return res.status(400).json({ error: 'missing_field', field: k });
    }
    const newAddr = {
      id: 'a_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name, phone, province, city, district, detail,
      isDefault: !!isDefault,
      createdAt: new Date().toISOString(),
    };
    let doc = await getUserDoc(u.zid);
    let list = (doc && doc.addresses) || [];
    // 去重: 相同 (province/city/district/detail/phone) 视为同一条
    const existIdx = list.findIndex(a =>
      a.detail === detail && a.province === province &&
      a.city === city && a.district === district && a.phone === phone);
    if (existIdx >= 0) {
      newAddr.id = list[existIdx].id || newAddr.id;
      list[existIdx] = { ...list[existIdx], ...newAddr };
    } else {
      if (list.length === 0) newAddr.isDefault = true;
      list.push(newAddr);
    }
    if (newAddr.isDefault) list = list.map(a => ({ ...a, isDefault: a.id === newAddr.id }));

    if (doc && doc._id) {
      await db.update('flower_user_addresses', doc._id, { addresses: list, updatedAt: new Date().toISOString() });
    } else {
      await db.insert('flower_user_addresses', {
        zid: u.zid, phone: u.phone || '', nickname: u.nickname || '',
        addresses: list, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    }
    res.json({ message: 'address_updated', address: list });
  } catch (e) {
    console.error('[PUT /auth/address]', e.message);
    res.status(500).json({ error: 'db_error', detail: e.message });
  }
});

// DELETE /auth/address/:id — 删除一条
router.delete('/address/:id', async (req, res) => {
  const u = requireZid(req, res); if (!u) return;
  try {
    const doc = await getUserDoc(u.zid);
    if (!doc || !doc.addresses) return res.json({ address: [] });
    const rid = req.params.id;
    let list = doc.addresses.filter(a => a.id !== rid);
    // 如果删掉了默认地址, 首位设为默认
    if (list.length && !list.some(a => a.isDefault)) list[0].isDefault = true;
    await db.update('flower_user_addresses', doc._id, { addresses: list, updatedAt: new Date().toISOString() });
    res.json({ message: 'address_deleted', address: list });
  } catch (e) {
    console.error('[DELETE /auth/address]', e.message);
    res.status(500).json({ error: 'db_error', detail: e.message });
  }
});

// POST /auth/address/:id/default — 设为默认
router.post('/address/:id/default', async (req, res) => {
  const u = requireZid(req, res); if (!u) return;
  try {
    const doc = await getUserDoc(u.zid);
    if (!doc || !doc.addresses) return res.status(404).json({ error: 'no_address' });
    const rid = req.params.id;
    const list = doc.addresses.map(a => ({ ...a, isDefault: a.id === rid }));
    await db.update('flower_user_addresses', doc._id, { addresses: list, updatedAt: new Date().toISOString() });
    res.json({ message: 'default_set', address: list });
  } catch (e) {
    console.error('[POST /auth/address/:id/default]', e.message);
    res.status(500).json({ error: 'db_error', detail: e.message });
  }
});

// ============================================================================
// 跨顶级域 SSO Bridge (2026-07-06, A 方案)
// ----------------------------------------------------------------------------
// 场景: horiculture.club <-> horiculture.space 是两个顶级域, cookie 不能共享。
// 流程:
//   1. space 前端 me-flower 401 → window.location = club/api/auth/cross-issue?return=<space-url>
//   2. club flower-api 拿本域 flower_token cookie → 签 30s ticket → 302 到
//      space/api/auth/consume-cross?ticket=<ticket>&return=<space-url>
//   3. space flower-api-la 验 ticket → Set-Cookie flower_token (Domain=.horiculture.space)
//      → 302 回 return
// 两端共享 JWT_SECRET (fallback flower-shop-secret-2024)。
// ============================================================================

// 允许的跨域 host 白名单(防 open redirect)
const XBRIDGE_ALLOWED_HOSTS = new Set([
  'horiculture.club',
  'horiculture.space',
  'www.horiculture.club',
  'www.horiculture.space',
]);
const XBRIDGE_TICKET_TTL_SEC = 30;
const XBRIDGE_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30d, 与 flower_token 保持一致

function xbridgeIsSafeReturn(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (!XBRIDGE_ALLOWED_HOSTS.has(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

// 返回请求应该 Set-Cookie 的 domain: 根据 Host 头判断当前站点
function xbridgeCookieDomain(reqHost) {
  const h = String(reqHost || '').toLowerCase().split(':')[0];
  if (h.endsWith('horiculture.club')) return '.horiculture.club';
  if (h.endsWith('horiculture.space')) return '.horiculture.space';
  return null;
}

// ============================================================================
// GET /auth/cross-issue?return=<url>
//   在本域读 flower_token cookie -> 签一个 30s 的 ticket -> 302 到目标域的 consume
// ============================================================================
router.get('/cross-issue', (req, res) => {
  const returnUrl = xbridgeIsSafeReturn(req.query.return);
  if (!returnUrl) return res.status(400).json({ error: 'invalid_return' });

  const cookies = parseCookies(req.headers.cookie);
  const flowerToken = cookies.flower_token;
  if (!flowerToken) {
    // 本域也没登录 -> 直接 302 回 return, 避免死循环
    return res.redirect(302, returnUrl);
  }

  let decoded;
  try {
    decoded = jwt.verify(flowerToken, JWT_SECRET);
  } catch (err) {
    return res.redirect(302, returnUrl);
  }

  // ticket = 一个短寿命 JWT, 内含原 flower_token 的 claims + purpose 标记
  const ticket = jwt.sign(
    {
      xb: 1, // cross-bridge marker
      zid: decoded.zid,
      phone: decoded.phone,
      email: decoded.email,
      nickname: decoded.nickname,
      role: decoded.role,
      roles: decoded.roles,
    },
    JWT_SECRET,
    { expiresIn: `${XBRIDGE_TICKET_TTL_SEC}s` }
  );

  // 拼装 consume URL
  const target = new URL(returnUrl);
  const consumeUrl = new URL('/api/auth/consume-cross', `${target.protocol}//${target.host}`);
  consumeUrl.searchParams.set('ticket', ticket);
  consumeUrl.searchParams.set('return', returnUrl);
  return res.redirect(302, consumeUrl.toString());
});

// ============================================================================
// GET /auth/consume-cross?ticket=<xxx>&return=<url>
//   验 ticket -> Set-Cookie flower_token (Domain=当前站点) -> 302 回 return
// ============================================================================
router.get('/consume-cross', (req, res) => {
  const returnUrl = xbridgeIsSafeReturn(req.query.return);
  if (!returnUrl) return res.status(400).json({ error: 'invalid_return' });

  const ticket = String(req.query.ticket || '');
  if (!ticket) return res.redirect(302, returnUrl);

  let decoded;
  try {
    decoded = jwt.verify(ticket, JWT_SECRET);
  } catch (err) {
    return res.redirect(302, returnUrl);
  }
  if (decoded.xb !== 1) return res.redirect(302, returnUrl);

  // 用 ticket 里的 claims 重新签一个 30d 的 flower_token
  const flowerToken = jwt.sign(
    {
      zid: decoded.zid,
      phone: decoded.phone,
      email: decoded.email,
      nickname: decoded.nickname,
      role: decoded.role,
      roles: decoded.roles,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  // 决定 cookie domain: 根据 Host 头
  const domain = xbridgeCookieDomain(req.headers.host);
  if (!domain) return res.status(400).json({ error: 'bad_host' });

  // 注意: 跨站 SSO 场景 flower_token cookie 已经是"当前一级域全站可见",
  // Secure + SameSite=Lax + HttpOnly=false (前端 auth-context.tsx 也要能读)
  const cookieParts = [
    `flower_token=${encodeURIComponent(flowerToken)}`,
    `Domain=${domain}`,
    'Path=/',
    `Max-Age=${XBRIDGE_COOKIE_MAX_AGE}`,
    'SameSite=Lax',
    'Secure',
  ];
  res.setHeader('Set-Cookie', cookieParts.join('; '));
  return res.redirect(302, returnUrl);
});

module.exports = router;
