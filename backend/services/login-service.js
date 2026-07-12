// backend/services/login-service.js
// Reusable Zitadel v2 session-based login service.
// Isolation: club <-> space are picked by host, each with its own OIDC client id.
// (Zitadel instance is currently shared — user isolation is enforced at the
//  client_id / org level. If we later split into two Zitadel instances the
//  ZITADEL_ISSUER_CLUB / ZITADEL_ISSUER_SPACE env vars will take over.)
'use strict';

const axios = require('axios');
const crypto = require('crypto');
const redis = require('redis');

const SESSION_TTL_SEC = parseInt(process.env.SESSION_TTL_SEC || String(30 * 24 * 3600), 10);
const REDIS_URL = process.env.REDIS_URL || 'redis://100.96.54.109:6379';

let _redis = null;
async function getRedis() {
  if (_redis && _redis.isOpen) return _redis;
  _redis = redis.createClient({ url: REDIS_URL });
  _redis.on('error', (e) => console.warn('[login-service:redis]', e.message));
  await _redis.connect();
  return _redis;
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// --- Brand isolation (club/space/la) ---
// Each brand has its own OIDC client id in Zitadel and its own cookie domain.
function pickBrand(host) {
  const h = String(host || '').toLowerCase().split(':')[0];
  if (h === '209.141.34.146') return 'la';
  if (h.endsWith('horiculture.club')) return 'club';
  if (h.endsWith('horiculture.space')) return 'space';
  return 'club'; // default when unknown
}

function brandConfig(brand) {
  const issuer = process.env[`ZITADEL_ISSUER_${brand.toUpperCase()}`]
    || process.env.ZITADEL_ISSUER
    || 'https://id.horiculture.club';
  const pat = process.env[`ZITADEL_PAT_${brand.toUpperCase()}`]
    || process.env.ZITADEL_PAT
    || process.env.ZITADEL_SVC_PAT
    || '';
  const clientId = brand === 'la'
    ? process.env.LA_CLIENT_ID
    : brand === 'space'
      ? (process.env.SPACE_CLIENT_ID || process.env.ZITADEL_SPACE_WEB_CLIENT_ID)
      : (process.env.CLUB_CLIENT_ID || process.env.ZITADEL_CLUB_WEB_CLIENT_ID);
  return { brand, issuer, pat, clientId };
}

function cookieDomainFor(host) {
  const h = String(host || '').toLowerCase().split(':')[0];
  if (h.endsWith('horiculture.club')) return '.horiculture.club';
  if (h.endsWith('horiculture.space')) return '.horiculture.space';
  return null; // 209 raw-IP -> host-only cookie
}

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

// --- Zitadel v2 session API ---
async function zitadelCreateSession({ issuer, pat }, loginName, password) {
  const resp = await axios.post(
    `${issuer}/v2/sessions`,
    { checks: { user: { loginName }, password: { password } } },
    {
      headers: { Authorization: `Bearer ${pat}`, 'Content-Type': 'application/json' },
      timeout: 10000,
      validateStatus: () => true,
    }
  );
  return resp;
}

async function zitadelReadSession({ issuer, pat }, sessionId) {
  const resp = await axios.get(`${issuer}/v2/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${pat}` },
    timeout: 8000,
    validateStatus: () => true,
  });
  return resp;
}

async function zitadelDeleteSession({ issuer, pat }, sessionId) {
  const resp = await axios.delete(`${issuer}/v2/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${pat}` },
    timeout: 8000,
    validateStatus: () => true,
  });
  return resp;
}

function setSidCookie(res, host, sid, maxAgeSec) {
  const dom = cookieDomainFor(host);
  const parts = [`sid=${sid}`, 'Path=/', `Max-Age=${maxAgeSec}`, 'HttpOnly', 'SameSite=Lax'];
  if (dom) parts.push(`Domain=${dom}`);
  parts.push('Secure'); // always Secure — nginx terminates TLS so proto=https
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSidCookie(res, host) {
  const dom = cookieDomainFor(host);
  const parts = ['sid=', 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax'];
  if (dom) parts.push(`Domain=${dom}`);
  parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

// --- Public helpers used by routes ---
async function passwordLogin(req, { loginName, password }) {
  const host = req.headers.host;
  const brand = pickBrand(host);
  const cfg = brandConfig(brand);
  if (!cfg.pat) throw new Error(`no PAT for brand ${brand}`);

  const resp = await zitadelCreateSession(cfg, loginName, password);
  if (resp.status !== 201 && resp.status !== 200) {
    const err = (resp.data && (resp.data.message || resp.data.error)) || `zitadel HTTP ${resp.status}`;
    const e = new Error(err);
    e.zitadelStatus = resp.status;
    e.zitadelData = resp.data;
    throw e;
  }
  const zSessionId = resp.data.sessionId;
  const zToken = resp.data.sessionToken;

  const detail = await zitadelReadSession(cfg, zSessionId);
  const zUser = (detail.data && detail.data.session && detail.data.session.factors && detail.data.session.factors.user) || {};

  const user = {
    zid: zUser.id || '',
    loginName: zUser.loginName || loginName,
    nickname: zUser.displayName || zUser.loginName || loginName,
    orgId: zUser.organizationId || '',
    brand,
    role: 'user',
    isAdmin: false,
    loginAt: new Date().toISOString(),
    zSessionId,
    zSessionToken: zToken, // kept for /logout
  };

  const sid = b64url(crypto.randomBytes(24));
  const r = await getRedis();
  await r.setEx(`sess:${sid}`, SESSION_TTL_SEC, JSON.stringify(user));

  // Upsert Mongo user_profiles (never blocks login on Mongo hiccup)
  try {
    const ups = require('./user-profile-service');
    await ups.upsertFromLogin(user);
  } catch (e) {
    console.warn('[login-service:profile-upsert]', e.message);
  }
  return { sid, user, brand };
}

async function readSession(req) {
  const sid = parseCookies(req.headers.cookie).sid;
  if (!sid) return null;
  const r = await getRedis();
  const raw = await r.get(`sess:${sid}`);
  if (!raw) return null;
  try { return { sid, user: JSON.parse(raw) }; } catch { return null; }
}

async function logoutSession(req) {
  const sid = parseCookies(req.headers.cookie).sid;
  if (!sid) return { ok: true, missing: true };
  const r = await getRedis();
  const raw = await r.get(`sess:${sid}`);
  if (raw) {
    try {
      const user = JSON.parse(raw);
      if (user.zSessionId) {
        const cfg = brandConfig(user.brand || pickBrand(req.headers.host));
        if (cfg.pat) {
          zitadelDeleteSession(cfg, user.zSessionId).catch(() => {});
        }
      }
    } catch { /* ignore */ }
  }
  await r.del(`sess:${sid}`);
  return { ok: true };
}

module.exports = {
  passwordLogin,
  readSession,
  logoutSession,
  setSidCookie,
  clearSidCookie,
  pickBrand,
  brandConfig,
  SESSION_TTL_SEC,
};
