// backend/routes/register-collector.js
// Public registration endpoint for plant-collector brands
// (school / shopclub / peony / tropical / plantshare).
//
// Uses Zitadel /management/v1/users/human/_import (proven working in peony
// mobile-auth-service) + systemuser JWT for cross-instance auth.

'use strict';

const express = require('express');
const axios   = require('axios');
const fs      = require('fs');
const crypto  = require('crypto');
const router  = express.Router();

const loginService = require('../services/login-service');
const pgProfiles   = require('../lib/pgProfiles');

const INTERNAL_ZITADEL = process.env.ZITADEL_INTERNAL_URL
  || 'http://zitadel.identity.svc.cluster.local:8080';

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

// systemuser JWT (same shape login-service uses; works on /v2/sessions)
const _b64u = (b) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
let _sysKey = null;
function readSysKey() {
  if (_sysKey) return _sysKey;
  const p = process.env.ZITADEL_SYSTEM_KEY_PATH || '/system-key/systemuser.key';
  try { _sysKey = fs.readFileSync(p, 'utf8'); return _sysKey; } catch { return null; }
}
function sysJwt() {
  const pem = readSysKey();
  if (!pem) return null;
  const now = Math.floor(Date.now() / 1000);
  const h = _b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  // Use the shape login-service.sysJwt uses (known-good for cross-instance sessions).
  const p = _b64u(JSON.stringify({ iss: 'systemuser', sub: 'systemuser', aud: 'http://id.horiculture.club:443', iat: now, exp: now + 300 }));
  const s = crypto.createSign('RSA-SHA256');
  s.update(h + '.' + p);
  return h + '.' + p + '.' + _b64u(s.sign(pem));
}

// Create human user via legacy /management/v1/users/human/_import
// (Same endpoint peony mobile-auth-service uses successfully.)
async function zitadelImportHuman(instanceHost, { userName, phone, email, firstName, lastName, nickname, password }) {
  const tok = sysJwt();
  if (!tok) return { ok: false, status: 500, data: { message: 'no_system_key' } };
  const headers = {
    Authorization: `Bearer ${tok}`,
    'Content-Type': 'application/json',
    'x-forwarded-host': instanceHost,
    'x-forwarded-proto': 'https',
    Host: instanceHost,
  };
  const body = {
    userName,                                   // must be unique in the instance
    profile: {
      firstName: firstName || 'User',
      lastName:  lastName  || (nickname || 'User'),
      nickName:  nickname  || firstName || userName,
      preferredLanguage: 'zh',
    },
    email: { email, isEmailVerified: true },
    ...(phone ? { phone: { phone: phone.startsWith('+') ? phone : '+86' + phone, isPhoneVerified: true } } : {}),
    password: String(password),
    passwordChangeRequired: false,
  };
  const resp = await axios.post(
    `${INTERNAL_ZITADEL}/management/v1/users/human/_import`,
    body,
    { headers, timeout: 12000, validateStatus: () => true }
  );
  return { ok: resp.status >= 200 && resp.status < 300, status: resp.status, data: resp.data };
}

router.post('/register-collector', express.json(), async (req, res) => {
  try {
    const { name, phone, email, password, brand: rawBrand } = req.body || {};
    const nameStr  = String(name || '').trim();
    const phoneStr = String(phone || '').trim().replace(/[^0-9]/g, '');
    const emailStr = email ? String(email).trim() : '';
    const pwStr    = String(password || '');
    if (!phoneStr || !pwStr) return res.status(400).json({ error: 'missing', detail: 'phone + password required' });
    if (!/^1[3-9]\d{9}$/.test(phoneStr)) return res.status(400).json({ error: 'bad_phone' });
    if (pwStr.length < 8) return res.status(400).json({ error: 'weak_password', detail: 'min 8 chars' });

    const brand = normalizeBrand(rawBrand);
    const { instance, sourceProject } = BRAND_MAP[brand];

    // userName MUST be email-shape when instance policy disallows phone-as-username
    const userName    = phoneStr + '@horiculture.local';
    const finalEmail  = emailStr || userName;
    const displayNick = nameStr || `${brand}-${phoneStr.slice(-4)}`;

    // Idempotency: if PG already has this phone, try auto-login
    try {
      const existing = await pgProfiles.getByLoginName(phoneStr);
      if (existing && existing.zid) {
        try {
          const { sid, user } = await loginService.passwordLogin(req, { loginName: phoneStr, password: pwStr, brand });
          loginService.setSidCookie(res, req.headers.host, sid, loginService.SESSION_TTL_SEC);
          return res.json({ ok: true, existed: true, brand, user: { zid: user.zid, loginName: user.loginName, nickname: user.nickname, brand } });
        } catch {
          return res.status(409).json({ error: 'phone_taken' });
        }
      }
    } catch (e) { console.warn('[register-collector:pg-precheck]', e.message); }

    // Create Zitadel human user in brand's instance
    const zResp = await zitadelImportHuman(instance, {
      userName,
      phone: phoneStr,
      email: finalEmail,
      firstName: nameStr || phoneStr.slice(-4),
      lastName:  '用户',
      nickname:  displayNick,
      password:  pwStr,
    });

    if (!zResp.ok) {
      const msg = String((zResp.data && (zResp.data.message || zResp.data.error)) || `zitadel HTTP ${zResp.status}`);
      if (zResp.status === 409 || /already.*(exist|taken)/i.test(msg)) {
        // Try auto-login as recovery
        try {
          const { sid, user } = await loginService.passwordLogin(req, { loginName: phoneStr, password: pwStr, brand });
          loginService.setSidCookie(res, req.headers.host, sid, loginService.SESSION_TTL_SEC);
          return res.json({ ok: true, existed: true, brand, user });
        } catch {
          return res.status(409).json({ error: 'exists' });
        }
      }
      console.warn('[register-collector:zitadel]', zResp.status, JSON.stringify(zResp.data).slice(0, 500));
      return res.status(502).json({ error: 'zitadel_create_failed', detail: msg });
    }

    const zid = (zResp.data && (zResp.data.userId || zResp.data.id)) || '';
    if (!zid) return res.status(502).json({ error: 'no_zid_from_zitadel' });

    // Upsert PG plant_collector.user_profiles (zid ⇔ phone)
    try {
      await pgProfiles.upsertFromLogin({
        zid,
        loginName: phoneStr,
        nickname:  displayNick,
        phone:     phoneStr,
        email:     finalEmail,
        brand,
        sourceProject,
        zitadelInstance: brand,
      });
    } catch (e) { console.warn('[register-collector:pg-upsert]', e.message); }

    // Auto-login
    try {
      const { sid, user } = await loginService.passwordLogin(req, { loginName: phoneStr, password: pwStr, brand });
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

router.post('/password-login', express.json(), async (req, res) => {
  try {
    const loginName = String((req.body || {}).loginName || (req.body || {}).username || '').trim();
    const password  = String((req.body || {}).password || '');
    const bodyBrand = String((req.body || {}).brand || '').trim().toLowerCase() || undefined;
    if (!loginName || !password) return res.status(400).json({ error: 'missing_credentials' });

    const { sid, user, brand } = await loginService.passwordLogin(req, { loginName, password, brand: bodyBrand });
    loginService.setSidCookie(res, req.headers.host, sid, loginService.SESSION_TTL_SEC);
    return res.json({ ok: true, brand, user: { zid: user.zid, loginName: user.loginName, nickname: user.nickname, brand: user.brand, role: user.role } });
  } catch (e) {
    console.warn('[auth:password-login] fail:', e.message, e.zitadelStatus || '');
    if (e.zitadelStatus === 401 || e.zitadelStatus === 400) return res.status(401).json({ error: 'invalid_credentials' });
    return res.status(500).json({ error: 'login_failed', detail: e.message });
  }
});

module.exports = router;
