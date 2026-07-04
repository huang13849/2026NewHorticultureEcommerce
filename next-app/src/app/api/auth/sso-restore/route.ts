// /api/auth/sso-restore — 读 zitadel.session cookie -> 调 flower-api /auth/sso-issue -> 签 flower JWT
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ZITADEL_ISSUER = process.env.ZITADEL_ISSUER || "http://100.96.54.109:31111";
const ZITADEL_PAT = process.env.ZITADEL_SVC_PAT || "";
const FLOWER_API = process.env.FLOWER_API_INTERNAL || "http://flower-api:3010";
const SSO_SECRET = process.env.SSO_INTERNAL_SECRET || "zitadel-sso-2026";

export async function POST(req: NextRequest) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const m = cookie.match(/(?:^|;\s*)zitadel\.session=([^;]+)/);
    if (!m) return NextResponse.json({ error: "no_zitadel_cookie" }, { status: 401 });
    const raw = decodeURIComponent(m[1]);
    const [sessionId, sessionToken] = raw.split(":");
    if (!sessionId || !sessionToken) return NextResponse.json({ error: "bad_cookie" }, { status: 401 });

    const r = await fetch(`${ZITADEL_ISSUER}/v2/sessions/${sessionId}?sessionToken=${encodeURIComponent(sessionToken)}`, {
      headers: { "Authorization": `Bearer ${ZITADEL_PAT}` },
    });
    if (!r.ok) return NextResponse.json({ error: "zitadel_invalid", status: r.status }, { status: 401 });
    const sj: { session?: { factors?: { user?: { loginName?: string } } } } = await r.json();
    const loginName = sj.session?.factors?.user?.loginName || "";
    const phone = loginName.split("@")[0];
    if (!/^1[3-9]\d{9}$/.test(phone)) return NextResponse.json({ error: "no_phone_in_session" }, { status: 401 });

    // 调 flower-api 内部端点签 flower JWT
    const fr = await fetch(`${FLOWER_API}/api/auth/sso-issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sso-secret": SSO_SECRET },
      body: JSON.stringify({ phone }),
    });
    const fj = await fr.json();
    if (!fr.ok) return NextResponse.json({ error: "flower_sso_failed", detail: fj }, { status: 500 });

    const res = NextResponse.json({ token: fj.token, user: fj.user });
    res.cookies.set("flower_token", fj.token, {
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 3600,
    });
    return res;
  } catch (e) {
    console.error("[sso-restore]", e);
    return NextResponse.json({ error: "server_error", detail: String(e) }, { status: 500 });
  }
}
