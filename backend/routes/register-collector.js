// backend/routes/register-collector.js
// New (2026-07-20): Public registration endpoint for plant-collector brands
// (school / shopclub / peony / tropical / plantshare / space).
//
// Flow:
//   1) POST /api/auth/register-collector { name, phone, password, brand, source, email? }
//   2) Create Zitadel human user in brand's instance (via systemuser JWT)
//   3) Set initial password
//   4) Upsert plant_collector.user_profiles (zid ⇔ loginName + phone + source_project)
//   5) Auto-login (create session) so client can jump straight into the app
//
// The whole thing MUST be idempotent: retries with the same phone should
// return the existing profile rather than duplicate-create.
'use strict';

const express = require('express');
const axios   = require('axios');
const router  = express.Router();

const loginService = require('../services/login-service');
const pgProfiles   = require('../lib/pgProfiles');

const INTERNAL_ZITADEL = process.env.ZITADEL_INTERNAL_URL
  || 'http://zitadel.identity.svc.cluster.local:8080';

// Map front-end `brand` param to the Zitadel instance host + source_project label
// used in plant_collector.user_profiles. Keep in sync with login-service.js.
const BRAND_MAP = {
  school:     { instance: 'id-school.horiculture.club',     sourceProject: 'edu' },
  shopclub:   { instance: 'id-shopclub.horiculture.club',   sourceProject: 'shop-club' },
  club:       { instance: 'id-shopclub.horiculture.club',   sourceProject: 'shop-club' },
  space:      { instance: 'id-shopclub.horiculture.club',   sourceProject: 'shop-space' },
  peony:      { instance: 'id-peony.horiculture.club',      sourceProject: 'peony-alliance' },
  tropical:   { instance: 'id-tropical.horiculture.club',   sourceProject: 'tropical' },
  plantshare: { instance: 'id-plantshare.horiculture.club', sourceProject: 'plant-share' },
};

function normalizeBrand(b) {
  const x = String(b || '').toLowerCase().trim();
  return BRAND_MAP[x] ? x : 'shopclub';
}

// Call Zitadel /v2/users/human with systemuser JWT, x-forwarded-host = instance
async function zitadelCreateHumanUser(instanceHost, { loginName, phone, email, displayName, password }) {
  const auth = loginService.__sysJwt ? loginService.__sysJwt() : null;
  // login-service does not expose sysJwt; reimplement here to avoid coupling
  const fs = require('fs');
  const crypto = require('crypto');
  const b64u = (b) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const keyPath = process.env.ZITADEL_SYSTEM_KEY_PATH || '/system-key/systemuser.key';
  let sysKey; try { sysKey = fs.readFileSync(keyPath, 'utf8'); } catch { throw new Error('no_system_key'); }
  const now = Math.floor(Date.now() / 1000);
  const jwtHead = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const jwtBody = b64u(JSON.stringify({ iss: 'systemuser', sub: 'systemuser', aud: 'http://id.horiculture.club:443', iat: now, exp: now + 300 }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(jwtHead + '.' + jwtBody);
  const jwt = jwtHead + '.' + jwtBody + '.' + b64u(signer.sign(sysKey));

  const headers = {
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json',
    'x-forwarded-host': instanceHost,
    'x-forwarded-proto': 'https',
  };
  const body = {
    username: loginName, // phone as username (school project convention)
    profile: {
      givenName: displayName || loginName,
      familyName: (displayName || loginName || 'User'),
      displayName: displayName || loginName,
      preferredLanguage: 'zh',
    },
    ...(email ? { email: { email, isVerified: false } } : {}),
    ...(phone ? { phone: { phone: phone.startsWith('+') ? phone : '+86' + phone, isVerified: false } } : {}),
    password: { password, changeRequired: false },
  };
  const resp = await axios.post(`${INTERNAL_ZITADEL}/v2/users/human`, body,
    { headers, timeout: 10000, validateStatus: () => true });
  return resp;
}

router.post('/register-collector', express.json(), async (req, res) => {
  try {
    const { name, phone, email, password, brand: rawBrand, source } = req.body || {};
    const nameStr  = String(name || '').trim();
    const phoneStr = String(phone || '').trim();
    const emailStr = email ? String(email).trim() : '';
    const pwStr    = String(password || '');
    if (!phoneStr || !pwStr) {
      return res.status(400).json({ error: 'missing', detail: 'phone + password required' });
    }
    if (!/^1\d{10}$/.test(phoneStr)) {
      return res.status(400).json({ error: 'bad_phone' });
    }
    if (pwStr.length < 8) {
      return res.status(400).json({ error: 'weak_password', detail: 'min 8 chars' });
    }

    const brand = normalizeBrand(rawBrand);
    // Force host so downstream loginService.pickBrand routes to correct brand
    const _bhMap = { school:'horiculture.club/school', shopclub:'horiculture.club', club:'horiculture.club', space:'horiculture.space', peony:'peony.horiculture.club', tropical:'tropical.horiculture.club', plantshare:'plantshare.horiculture.club' };
    if (_bhMap[brand] && req.headers) req.headers = { ...req.headers, host: _bhMap[brand] };
    const { instance, sourceProject } = BRAND_MAP[brand];

    // 1) Fast path: phone already registered → return existing (idempotent)
    try {
      const existing = await pgProfiles.getByLoginName(phoneStr);
      if (existing && existing.zid) {
        // Try to auto-login with provided password so the client still gets a session.
        try {
          const { sid, user } = await loginService.passwordLogin(req, { loginName: phoneStr, password: pwStr });
          loginService.setSidCookie(res, req.headers.host, sid, loginService.SESSION_TTL_SEC);
          return res.json({ ok: true, existed: true, brand, user: { zid: user.zid, loginName: user.loginName, nickname: user.nickname, brand } });
        } catch {
          return res.status(409).json({ error: 'phone_taken', detail: 'phone already registered; password mismatch' });
        }
      }
    } catch (e) {
      console.warn('[register-collector:pg-precheck]', e.message);
    }

    // 2) Create Zitadel human user in brand's instance
    const zResp = await zitadelCreateHumanUser(instance, {
      loginName: phoneStr,
      phone: phoneStr,
      email: emailStr,
      displayName: nameStr || phoneStr,
      password: pwStr,
    });
    if (zResp.status !== 200 && zResp.status !== 201) {
      const msg = (zResp.data && (zResp.data.message || zResp.data.error)) || `zitadel HTTP ${zResp.status}`;
      // Duplicate → recover as existed
      if (String(msg).toLowerCase().includes('already exists') || zResp.status === 409) {
        try {
          const existing = await pgProfiles.getByLoginName(phoneStr);
          if (existing && existing.zid) {
            const { sid, user } = await loginService.passwordLogin(req, { loginName: phoneStr, password: pwStr });
            loginService.setSidCookie(res, req.headers.host, sid, loginService.SESSION_TTL_SEC);
            return res.json({ ok: true, existed: true, brand, user });
          }
        } catch {}
        return res.status(409).json({ error: 'exists', detail: msg });
      }
      console.warn('[register-collector:zitadel]', zResp.status, JSON.stringify(zResp.data).slice(0, 500));
      return res.status(502).json({ error: 'zitadel_create_failed', detail: msg });
    }
    const zid = (zResp.data && (zResp.data.userId || zResp.data.id)) || '';
    if (!zid) return res.status(502).json({ error: 'no_zid_from_zitadel' });

    // 3) Upsert plant_collector.user_profiles (zid ⇔ phone)
    try {
      await pgProfiles.upsertFromLogin({
        zid,
        loginName: phoneStr,
        nickname:  nameStr || phoneStr,
        phone:     phoneStr,
        email:     emailStr,
        brand,
        sourceProject,
        zitadelInstance: brand,
      });
    } catch (e) {
      console.warn('[register-collector:pg-upsert]', e.message);
      // Continue; login will re-upsert.
    }

    // 4) Auto-login
    try {
      const { sid, user } = await loginService.passwordLogin(req, { loginName: phoneStr, password: pwStr });
      loginService.setSidCookie(res, req.headers.host, sid, loginService.SESSION_TTL_SEC);
      return res.json({ ok: true, brand, user: { zid: user.zid, loginName: user.loginName, nickname: user.nickname, brand } });
    } catch (e) {
      console.warn('[register-collector:auto-login]', e.message);
      return res.json({ ok: true, brand, autoLogin: false, zid });
    }
  } catch (e) {
    console.error('[register-collector] fatal:', e.stack || e.message);
    return res.status(500).json({ error: 'internal', detail: e.message });
  }
});

// Also expose /api/auth/password-login here (existing impl lives in
// /api/session/password-login; we mirror for the /api/auth/* namespace so the
// public school/shop-club auth.html can hit a stable URL).
router.post('/password-login', express.json(), async (req, res) => {
  try {
    const loginName = String((req.body || {}).loginName || (req.body || {}).username || '').trim();
    const password  = String((req.body || {}).password || '');
    if (!loginName || !password) return res.status(400).json({ error: 'missing_credentials' });

    const bodyBrand = String((req.body || {}).brand || '').trim().toLowerCase();
    if (bodyBrand) {
      // Proxy req so pickBrand(host) inside loginService returns the requested brand
      const brandHosts = {
        school: 'horiculture.club/school',
        shopclub: 'horiculture.club',
        club: 'horiculture.club',
        space: 'horiculture.space',
        peony: 'peony.horiculture.club',
        tropical: 'tropical.horiculture.club',
        plantshare: 'plantshare.horiculture.club',
      };
      const forcedHost = brandHosts[bodyBrand];
      if (forcedHost && req.headers) {
        req.headers = { ...req.headers, host: forcedHost };
      }
    }
    const { sid, user, brand } = await loginService.passwordLogin(req, { loginName, password });
    loginService.setSidCookie(res, req.headers.host, sid, loginService.SESSION_TTL_SEC);
    return res.json({ ok: true, brand, user: { zid: user.zid, loginName: user.loginName, nickname: user.nickname, brand: user.brand, role: user.role } });
  } catch (e) {
    console.warn('[auth:password-login] fail:', e.message, e.zitadelStatus || '');
    if (e.zitadelStatus === 401 || e.zitadelStatus === 400) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    return res.status(500).json({ error: 'login_failed', detail: e.message });
  }
});

module.exports = router;
