import { NextRequest, NextResponse } from "next/server";

// 需要绕过自建登录页, 交给 Zitadel 原生 v2 login UI 的 clientId
const BYPASS_CLIENT_IDS = new Set<string>([
  "380209874455429320", // ZITADEL Management Console
]);

const ZITADEL_INTERNAL = process.env.ZITADEL_BASE_URL || "http://id.horiculture.club:8080";
const ZITADEL_PAT = process.env.ZITADEL_SVC_PAT || "";
const ZITADEL_HOST = process.env.ZITADEL_EXTERNAL_HOST || "id.horiculture.club";

// Zitadel v2 login UI (NodePort 31112, ns identity) — 通过 tailscale 直接暴露
const ZITADEL_LOGIN_V2 = process.env.ZITADEL_LOGIN_V2_URL || "http://100.96.54.109:31112";

export const config = {
  matcher: ["/login"],
};

export async function middleware(req: NextRequest) {
  const ar = req.nextUrl.searchParams.get("authRequest");
  if (!ar) return NextResponse.next();

  try {
    // 查 authRequest 拿 clientId
    const r = await fetch(`${ZITADEL_INTERNAL}/v2/oidc/auth_requests/${ar}`, {
      headers: {
        Authorization: `Bearer ${ZITADEL_PAT}`,
        Host: ZITADEL_HOST,
      },
    });
    if (!r.ok) return NextResponse.next();
    const d = (await r.json()) as { authRequest?: { clientId?: string } };
    const cid = d.authRequest?.clientId;
    if (cid && BYPASS_CLIENT_IDS.has(cid)) {
      // 交回 Zitadel 官方 v2 login UI
      const url = `${ZITADEL_LOGIN_V2}/login?authRequest=${encodeURIComponent(ar)}`;
      return NextResponse.redirect(url, 302);
    }
  } catch {
    /* fall through, use self-built page */
  }
  return NextResponse.next();
}
