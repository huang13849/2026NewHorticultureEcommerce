// Zitadel Session API helper — 供 /api/auth/zsession 与 /api/auth/finalize 使用
// 用 Service User PAT 调 v2 Session API + Management API
// 关键: 手机号 -> Zitadel loginName = <phone>@horiculture.local
// 关键: Zitadel 按 Host header 找 instance, 必须传 Host = ExternalDomain (id.horiculture.club)

const ZITADEL_BASE = process.env.ZITADEL_BASE_URL || "http://zitadel.identity.svc.cluster.local:8080";
const ZITADEL_HOST = process.env.ZITADEL_EXTERNAL_HOST || "id.horiculture.club";
const ZITADEL_PAT = process.env.ZITADEL_SVC_PAT || "";
const ZITADEL_ORG = process.env.ZITADEL_ORG_ID || "380209872962126024";
const LOGIN_DOMAIN = process.env.ZITADEL_LOGIN_DOMAIN || "horiculture.local";

function h(): Record<string, string> {
  return {
    Authorization: `Bearer ${ZITADEL_PAT}`,
    "x-zitadel-orgid": ZITADEL_ORG,
    "Content-Type": "application/json",
    // Node undici allows overriding Host header — required for ExternalDomain gate
    Host: ZITADEL_HOST,
  };
}

async function zfetch(path: string, method: string, body?: unknown): Promise<Response> {
  return fetch(`${ZITADEL_BASE}${path}`, {
    method,
    headers: h(),
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

export function phoneToLoginName(phone: string): string {
  return `${phone}@${LOGIN_DOMAIN}`;
}

export async function findUserByLoginName(loginName: string): Promise<string | null> {
  const r = await zfetch(`/v2/users`, "POST", {
    queries: [{ loginNameQuery: { loginName, method: "TEXT_QUERY_METHOD_EQUALS" } }],
  });
  if (!r.ok) return null;
  const d = (await r.json()) as { result?: Array<{ userId?: string }> };
  return d.result?.[0]?.userId || null;
}

export async function ensureUser(phone: string, password: string): Promise<string> {
  const loginName = phoneToLoginName(phone);
  let uid = await findUserByLoginName(loginName);
  if (uid) return uid;
  const r = await zfetch(`/v2/users/human`, "POST", {
    username: loginName,
    organization: { orgId: ZITADEL_ORG },
    profile: { givenName: `花友${phone.slice(-4)}`, familyName: "Horiculture", displayName: `花友${phone.slice(-4)}` },
    email: { email: `${phone}@horiculture.local`, isVerified: true },
    phone: { phone: `+86${phone}`, isVerified: true },
    password: { password },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`ensureUser failed: ${r.status} ${t.slice(0, 200)}`);
  }
  const d = (await r.json()) as { userId?: string };
  uid = d.userId || null;
  if (!uid) throw new Error("ensureUser: no userId returned");
  return uid;
}

export async function resetPassword(userId: string, password: string): Promise<void> {
  const r = await zfetch(`/v2/users/${userId}/password`, "POST", { newPassword: { password } });
  if (!r.ok) throw new Error(`resetPassword: ${r.status}`);
}

export interface ZSession {
  sessionId: string;
  sessionToken: string;
}

export async function createSessionWithPassword(
  loginName: string,
  password: string
): Promise<ZSession | null> {
  const r = await zfetch(`/v2/sessions`, "POST", {
    checks: { user: { loginName }, password: { password } },
  });
  if (!r.ok) return null;
  const d = (await r.json()) as ZSession;
  return d.sessionId ? d : null;
}

export async function finalizeAuthRequest(
  authRequestId: string,
  sessionId: string,
  sessionToken: string
): Promise<string | null> {
  const r = await zfetch(`/v2/oidc/auth_requests/${authRequestId}`, "POST", {
    session: { sessionId, sessionToken },
  });
  if (!r.ok) return null;
  const d = (await r.json()) as { callbackUrl?: string };
  return d.callbackUrl || null;
}
