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

// ============================================================================
// GET /auth/me   —— 直接从 flower_token 解, 不查库
// ============================================================================
router.get('/me', (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'unauthenticated' });
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const isAdmin = decoded.role === 'super_admin' || decoded.role === 'admin';
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
      address: [],
    });
  } catch (err) {
    return res.status(401).json({ error: 'token_invalid' });
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
router.put('/address', (req, res) => res.status(501).json({ error: 'not_implemented', note: 'awaiting zid-based reimpl' }));

module.exports = router;
