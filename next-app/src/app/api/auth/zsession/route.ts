import { NextRequest, NextResponse } from "next/server";
import {
  ensureUser,
  phoneToLoginName,
  createSessionWithPassword,
  resetPassword,
  findUserByLoginName,
  finalizeAuthRequest,
} from "@/lib/zitadel-session";

/**
 * POST /api/auth/zsession
 *   body: { phone, password, authRequestId? }
 *   1. try create Zitadel session with password
 *   2. if 401 (user exists but pass mismatch) → resetPassword to align with MongoDB, retry
 *   3. if authRequestId present → finalize → return { callbackUrl }
 *   4. else → set cookie zitadel.session
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { phone?: string; password?: string; authRequestId?: string };
    const { phone, password, authRequestId } = body;
    if (!phone || !password) return NextResponse.json({ error: "phone/password required" }, { status: 400 });

    const loginName = phoneToLoginName(phone);
    let sess = await createSessionWithPassword(loginName, password);

    if (!sess) {
      // user 可能不存在或密码不一致
      const uid = await findUserByLoginName(loginName);
      if (uid) {
        // 存在 -> 重置密码 (双写: MongoDB 已经过认证, 强制 Zitadel 对齐)
        await resetPassword(uid, password);
        sess = await createSessionWithPassword(loginName, password);
      } else {
        // 不存在 -> 建
        await ensureUser(phone, password);
        sess = await createSessionWithPassword(loginName, password);
      }
    }

    if (!sess) return NextResponse.json({ error: "zitadel session failed" }, { status: 500 });

    // 若 OIDC 流程 -> finalize
    if (authRequestId) {
      const cb = await finalizeAuthRequest(authRequestId, sess.sessionId, sess.sessionToken);
      if (!cb) return NextResponse.json({ error: "finalize failed" }, { status: 500 });
      return NextResponse.json({ callbackUrl: cb });
    }

    // 直登 -> 存 session token 到 cookie, 供后续 peony/tropical SSO 使用
    const res = NextResponse.json({ ok: true, sessionId: sess.sessionId });
    res.cookies.set("zitadel.session", `${sess.sessionId}:${sess.sessionToken}`, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      domain: ".horiculture.club",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "err" }, { status: 500 });
  }
}
