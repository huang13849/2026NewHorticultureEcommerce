/**
 * flower-api Redis-backed session (2026-07-09)
 *
 * 简化认证:  Zitadel OIDC 只在登录时校验一次, 之后 sid cookie -> Redis 读取。
 *
 *   GET  /api/session/login?redirect=<url>    -> 302 Zitadel authorize
 *   GET  /api/session/callback?code=xxx      -> code exchange + id_token verify
 *                                                -> SET Redis sess:<sid> {user}
 *                                                -> Set-Cookie sid; -> 302 redirect
 *   GET  /api/session/me                      -> 读 cookie -> Redis -> user | 401
 *   POST /api/session/logout                  -> DEL Redis + expire cookie
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const redis = require('redis');

// ---------- Redis ----------
const REDIS_URL = process.env.REDIS_URL || 'redis://100.96.54.109:6379';
const SESSION_TTL_SEC = 30 * 24 * 60 * 60; // 30d

let _redis = null;
async function getRedis() {
  if (_redis && _redis.isOpen) return _redis;
  _redis = redis.createClient({ url: REDIS_URL });
  _redis.on('error', (e) => console.warn('[session:redis]', e.message));
  await _redis.connect();
  return _redis;
}

// ---------- Zitadel ----------
const ZITADEL_ISSUER = process.env.ZITADEL_ISSUER || 'https://id.horiculture.club';
const ZITADEL_JWKS_URI = process.env.ZITADEL_JWKS_URI || `${ZITADEL_ISSUER}/oauth/v2/keys`;

// 按 host 选 client
function pickClient(host) {
  const h = String(host || '').toLowerCase().split(':')[0];
  if (h === '209.141.34.146') {
    return { clientId: process.env.LA_CLIENT_ID, clientSecret: process.env.LA_CLIENT_SECRET, brand: 'la' };
  }
  if (h.endsWith('horiculture.club')) {
    return { clientId: process.env.CLUB_CLIENT_ID, clientSecret: process.env.CLUB_CLIENT_SECRET, brand: 'club' };
  }
  return { clientId: process.env.SPACE_CLIENT_ID, clientSecret: process.env.SPACE_CLIENT_SECRET, brand: 'space' };
}

function siteBase(req) {
  const proto = (req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http')).split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return `${proto}://${host}`;
}

function cookieDomain(req) {
  const h = String(req.headers.host || '').toLowerCase().split(':')[0];
  if (h.endsWith('horiculture.club')) return '.horiculture.club';
  if (h.endsWith('horiculture.space')) return '.horiculture.space';
  return null; // 209 IP -> host-only cookie
}

// JWKS cache
let jwksCache = { keys: null, at: 0 };
async function getJwks() {
  if (jwksCache.keys && (Date.now() - jwksCache.at) < 10 * 60 * 1000) return jwksCache.keys;
  const r = await axios.get(ZITADEL_JWKS_URI, { timeout: 5000 });
  jwksCache = { keys: r.data.keys, at: Date.now() };
  return jwksCache.keys;
}

async function verifyIdToken(idToken, audience) {
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded) throw new Error('id_token decode failed');
  const keys = await getJwks();
  const jwk = keys.find(k => k.kid === decoded.header.kid);
  if (!jwk) throw new Error(`jwks no kid=${decoded.header.kid}`);
  return jwt.verify(idToken, jwkToPem(jwk), {
    algorithms: ['RS256'],
    issuer: ZITADEL_ISSUER,
    audience,
  });
}

// ---------- PKCE ----------
function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function makePkce() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

// ---------- routes ----------

// GET /api/session/login?redirect=/dashboard
router.get('/login', async (req, res) => {
  try {
    const { clientId, brand } = pickClient(req.headers.host);
    if (!clientId) return res.status(500).json({ error: 'no_client_for_host', host: req.headers.host });

    const redirectTo = String(req.query.redirect || '/');
    const state = b64url(crypto.randomBytes(16));
    const nonce = b64url(crypto.randomBytes(16));
    const pkce = makePkce();

    const r = await getRedis();
    await r.setEx(`login:${state}`, 600, JSON.stringify({
      redirect: redirectTo,
      nonce,
      verifier: pkce.verifier,
      brand,
      host: req.headers.host,
    }));

    const cbUrl = `${siteBase(req)}/api/session/callback`;
    const authUrl = new URL(`${ZITADEL_ISSUER}/oauth/v2/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', cbUrl);
    authUrl.searchParams.set('scope', 'openid profile email phone offline_access');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('code_challenge', pkce.challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('ui_locales', 'zh-CN');
    return res.redirect(302, authUrl.toString());
  } catch (e) {
    console.error('[session:login]', e);
    return res.status(500).json({ error: 'login_failed', detail: e.message });
  }
});

// GET /api/session/callback?code=xxx&state=xxx
router.get('/callback', async (req, res) => {
  try {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    if (!code || !state) return res.status(400).send('missing code/state');

    const r = await getRedis();
    const raw = await r.get(`login:${state}`);
    if (!raw) return res.status(400).send('state expired');
    await r.del(`login:${state}`);
    const stateData = JSON.parse(raw);

    const { clientId, clientSecret } = pickClient(req.headers.host);
    const cbUrl = `${siteBase(req)}/api/session/callback`;

    // exchange code
    const body = new URLSearchParams();
    body.set('grant_type', 'authorization_code');
    body.set('code', code);
    body.set('redirect_uri', cbUrl);
    body.set('client_id', clientId);
    if (clientSecret) body.set('client_secret', clientSecret);
    body.set('code_verifier', stateData.verifier);

    const tokenResp = await axios.post(`${ZITADEL_ISSUER}/oauth/v2/token`, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
      validateStatus: () => true,
    });
    if (tokenResp.status !== 200) {
      console.warn('[session:callback] token exchange', tokenResp.status, JSON.stringify(tokenResp.data).slice(0, 300));
      return res.status(401).send('token exchange failed');
    }
    const { id_token } = tokenResp.data;
    if (!id_token) return res.status(401).send('no id_token');

    const claims = await verifyIdToken(id_token, clientId);
    if (claims.nonce && claims.nonce !== stateData.nonce) return res.status(401).send('nonce mismatch');

    // extract user
    const phone = claims.phone_number
      || (String(claims.preferred_username || '').match(/^(1\d{10})/) || [])[1]
      || '';
    const rolesRaw = claims['urn:zitadel:iam:org:project:roles'] || {};
    const roles = Object.keys(rolesRaw);
    const isAdmin = roles.includes('admin');
    const user = {
      zid: claims.sub,
      phone,
      email: claims.email || '',
      nickname: isAdmin ? '超级管理员' : (claims.name || claims.given_name || (phone ? `花友${phone.slice(-4)}` : '花友')),
      role: isAdmin ? 'super_admin' : (roles.includes('dealer') ? 'dealer' : 'user'),
      roles,
      isAdmin,
      brand: stateData.brand,
      loginAt: new Date().toISOString(),
    };

    // create session
    const sid = b64url(crypto.randomBytes(24));
    await r.setEx(`sess:${sid}`, SESSION_TTL_SEC, JSON.stringify(user));

    const dom = cookieDomain(req);
    const cookieParts = [
      `sid=${sid}`,
      'Path=/',
      `Max-Age=${SESSION_TTL_SEC}`,
      'HttpOnly',
      'SameSite=Lax',
    ];
    if (dom) cookieParts.push(`Domain=${dom}`);
    // Secure 只在 https
    const proto = (req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    if (proto === 'https') cookieParts.push('Secure');
    res.setHeader('Set-Cookie', cookieParts.join('; '));

    // safe redirect (only relative or same-host)
    let redirectTo = stateData.redirect || '/';
    if (/^https?:\/\//i.test(redirectTo)) redirectTo = '/';
    return res.redirect(302, redirectTo);
  } catch (e) {
    console.error('[session:callback]', e);
    return res.status(500).send('callback error: ' + e.message);
  }
});

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(/;\s*/).forEach(p => {
    const i = p.indexOf('=');
    if (i < 0) return;
    out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

// GET /api/session/me
router.get('/me', async (req, res) => {
  try {
    const sid = parseCookies(req.headers.cookie).sid;
    if (!sid) return res.status(401).json({ error: 'no_session' });
    const r = await getRedis();
    const raw = await r.get(`sess:${sid}`);
    if (!raw) return res.status(401).json({ error: 'session_expired' });
    return res.json({ user: JSON.parse(raw) });
  } catch (e) {
    console.error('[session:me]', e);
    return res.status(500).json({ error: 'internal', detail: e.message });
  }
});

// POST /api/session/logout   (GET also allowed for simple links)
async function doLogout(req, res) {
  try {
    const sid = parseCookies(req.headers.cookie).sid;
    if (sid) {
      const r = await getRedis();
      await r.del(`sess:${sid}`);
    }
    const dom = cookieDomain(req);
    const parts = ['sid=', 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax'];
    if (dom) parts.push(`Domain=${dom}`);
    res.setHeader('Set-Cookie', parts.join('; '));
    if (req.method === 'GET') {
      const back = String(req.query.redirect || '/');
      return res.redirect(302, /^https?:\/\//i.test(back) ? '/' : back);
    }
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'internal', detail: e.message });
  }
}
router.post('/logout', doLogout);
router.get('/logout', doLogout);

module.exports = router;
