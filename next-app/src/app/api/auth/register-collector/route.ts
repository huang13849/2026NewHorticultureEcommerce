// /api/auth/register-collector — 注册植物收藏家 → Shop Club instance
// 使用 Node.js 内建 crypto (无外部依赖)，自动打 "植物收藏家" 标签
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { createSign } from 'crypto';

export const runtime = 'nodejs';

const KEY_PATH = process.env.ZITADEL_SYSTEM_KEY_PATH || '/system-key/systemuser.key';
const ZITADEL_URL = process.env.ZITADEL_URL || 'http://zitadel.identity.svc.cluster.local:8080';
const SHOPCLUB_HOST = 'id-shopclub.horiculture.club';
const AUD = 'http://id.horiculture.club:443';
const USER_MGMT_URL = process.env.USER_MGMT_URL || 'http://api-gateway.supply-chain.svc.cluster.local:8080';

function b64url(buf: Buffer | string): string {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function sysJwt(): string {
  let pem = '';
  try {
    pem = readFileSync(KEY_PATH, 'utf8');
  } catch (e) {
    throw new Error('systemuser_key_unavailable');
  }
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: 'systemuser', sub: 'systemuser', aud: AUD, iat: now, exp: now + 300,
  }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const sig = b64url(signer.sign(pem));
  return `${header}.${payload}.${sig}`;
}

async function zitadelPost(path: string, body: unknown, host: string) {
  const tok = sysJwt();
  const r = await fetch(`${ZITADEL_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tok}`,
      'Content-Type': 'application/json',
      Host: host,
    },
    body: JSON.stringify(body),
  });
  return { status: r.status, text: await r.text() };
}

export async function POST(req: NextRequest) {
  let email = '', password = '', firstName = '', lastName = '', redirect = '/';
  const ct = req.headers.get('content-type') || '';
  const isFormPost = ct.includes('urlencoded') || ct.includes('multipart');

  if (isFormPost) {
    const fd = await req.formData();
    email = String(fd.get('email') || '').trim();
    password = String(fd.get('password') || '');
    firstName = String(fd.get('firstName') || '').trim();
    lastName = String(fd.get('lastName') || '').trim();
    redirect = String(fd.get('redirect') || '/');
  } else {
    const b = await req.json().catch(() => ({}));
    email = String(b.email || '').trim();
    password = String(b.password || '');
    firstName = String(b.firstName || '').trim();
    lastName = String(b.lastName || '').trim();
    redirect = String(b.redirect || '/');
  }

  const bail = (err: string) => isFormPost
    ? NextResponse.redirect(new URL(`/register?error=${err}&redirect=${encodeURIComponent(redirect)}`, req.url), { status: 303 })
    : NextResponse.json({ error: err }, { status: 400 });

  if (!email || !password || !firstName || !lastName) return bail('missing');
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return bail('weak_password');

  // 1) Create user in Shop Club instance
  const createBody = {
    userName: email,
    profile: { firstName, lastName, displayName: `${firstName} ${lastName}`, preferredLanguage: 'zh' },
    email: { email, isEmailVerified: true },
    password: { password, changeRequired: false },
  };
  let created;
  try {
    created = await zitadelPost('/management/v1/users/human/_import', createBody, SHOPCLUB_HOST);
  } catch (e: any) {
    console.error('[register-collector] jwt/network error', e?.message);
    if (String(e?.message).includes('systemuser_key_unavailable')) return bail('service_unavailable');
    return bail('network');
  }
  if (created.status >= 400) {
    console.error('[register-collector] create failed', created.status, created.text);
    if (/already|exists|AlreadyExists/i.test(created.text)) return bail('exists');
    return bail(`zitadel_${created.status}`);
  }
  let userId = '';
  try { userId = JSON.parse(created.text)?.userId || ''; } catch {}

  // 2) Auto-tag as "植物收藏家" in user-management system (best effort)
  try {
    await fetch(`${USER_MGMT_URL}/api/users/tag-by-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, source: 'shopclub-register', instance: 'shopclub',
        zitadelUserId: userId, tags: ['植物收藏家'],
      }),
    });
  } catch (e) {
    console.warn('[register-collector] user-mgmt tag failed', e);
  }

  if (isFormPost) {
    return NextResponse.redirect(new URL(`/register?ok=1&redirect=${encodeURIComponent(redirect)}`, req.url), { status: 303 });
  }
  return NextResponse.json({ ok: true, userId });
}
