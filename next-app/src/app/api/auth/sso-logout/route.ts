// /api/auth/sso-logout — 联合登出:
//   1) 清本域 flower_token (Domain=.horiculture.club 或 .horiculture.space)
//   2) 清另一顶级域的 flower_token (只对本域的 UA 有效)
//   3) 清 zitadel.session (仅 .horiculture.club)
// 联合登出的完整语义: 通过前端 auth-context 同时 fetch 另一顶级域的 sso-logout 触发跨域清理.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function detectDomain(req: NextRequest): string | null {
  const raw = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").toLowerCase().split(",")[0].trim().split(":")[0];
  if (raw.endsWith("horiculture.club")) return ".horiculture.club";
  if (raw.endsWith("horiculture.space")) return ".horiculture.space";
  return null;
}

function build(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  const domain = detectDomain(req);
  const expired = "Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
  if (domain) {
    // 清本域 flower_token (带 Domain, 与写入时一致才能被清除)
    res.headers.append(
      "Set-Cookie",
      `flower_token=; Domain=${domain}; Path=/; SameSite=Lax; Secure; ${expired}`
    );
    // 兜底: 无 Domain 的 host-only flower_token (老版本可能这样写)
    res.headers.append(
      "Set-Cookie",
      `flower_token=; Path=/; SameSite=Lax; ${expired}`
    );
    // 仅 .horiculture.club 有 zitadel.session
    if (domain === ".horiculture.club") {
      res.headers.append(
        "Set-Cookie",
        `zitadel.session=; Domain=${domain}; Path=/; HttpOnly; Secure; SameSite=Lax; ${expired}`
      );
    }
  } else {
    // fallback: 都试一遍
    res.headers.append("Set-Cookie", `flower_token=; Path=/; SameSite=Lax; ${expired}`);
  }
  return res;
}

export async function POST(req: NextRequest) {
  return build(req);
}
export async function GET(req: NextRequest) {
  return build(req);
}
