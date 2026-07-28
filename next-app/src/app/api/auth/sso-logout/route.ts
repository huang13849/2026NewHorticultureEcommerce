// /api/auth/sso-logout — 清 zitadel.session (Domain=.horiculture.club) 与本地 flower_token
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // 清 SSO cookie -> tropical / peony / 主域下次刷新都失去 SSO
  res.headers.append(
    "Set-Cookie",
    "zitadel.session=; Domain=.horiculture.club; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );
  // 清本地 flower_token
  res.headers.append(
    "Set-Cookie",
    "flower_token=; Path=/; SameSite=Lax; Max-Age=0"
  );
  return res;
}
