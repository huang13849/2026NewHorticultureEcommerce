"use client";
// /login — Zitadel OIDC-only 单点登录/注册
// 用户点按钮 -> 走 startSSO -> NextAuth signIn -> 302 到 Zitadel Hosted Login UI
// 从 Zitadel Login UI 回来 (登录/注册完成) -> NextAuth callback -> Session 已建
// 再由 auth-context useEffect 把 session.flowerToken 写到 localStorage.flower_token
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { startSSO } from "@/lib/sso";

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { user } = useAuth();
  const redirect = sp?.get("redirect") || sp?.get("callbackUrl") || "/";
  const errCode = sp?.get("error") || "";

  const [autoStarting, setAutoStarting] = useState(false);

  useEffect(() => {
    if (user) {
      if (/^https?:\/\//i.test(redirect)) {
        try {
          const u = new URL(redirect);
          if (/(^|\.)horiculture\.(club|space)$/i.test(u.hostname)) {
            window.location.href = redirect;
            return;
          }
        } catch { /* ignore */ }
      }
      router.replace(redirect);
    }
  }, [user, redirect, router]);

  async function doSSO() {
    setAutoStarting(true);
    try {
      await startSSO(redirect);
    } catch (e) {
      console.error("[login] startSSO failed:", e);
      setAutoStarting(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 40%, #f0fdf4 100%)",
      display: "flex", flexDirection: "column",
    }}>
      <header style={{ padding: "18px 28px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 28 }}>🌿</span>
        <div>
          <div style={{ fontWeight: 800, color: "#047857", fontSize: 17, lineHeight: 1.1 }}>植物收藏家</div>
          <div style={{ fontSize: 10, color: "#065f46", opacity: 0.75 }}>Plant Collector · 林草二十年</div>
        </div>
      </header>

      <div style={{ position: "absolute", top: 60, right: -40, fontSize: 200, opacity: 0.08, pointerEvents: "none" }}>🌸</div>
      <div style={{ position: "absolute", bottom: -20, left: -30, fontSize: 180, opacity: 0.08, pointerEvents: "none" }}>🌱</div>

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", position: "relative", zIndex: 1 }}>
        <div style={{
          width: "100%", maxWidth: 420, background: "#ffffff", borderRadius: 20,
          padding: "36px 30px",
          boxShadow: "0 10px 40px rgba(4, 120, 87, 0.08), 0 2px 8px rgba(0,0,0,0.03)",
          border: "1px solid #d1fae5",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>🔐</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#111827" }}>登录 / 注册</h1>
          <p style={{ marginTop: 8, marginBottom: 24, fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
            平台统一走 Zitadel 单点身份 (id.horiculture.club)。<br />
            登录成功后自动返回。
          </p>

          {errCode && (
            <div style={{ marginBottom: 16, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, fontSize: 12, color: "#b91c1c", textAlign: "left" }}>
              登录失败: {errCode}
            </div>
          )}

          <button
            onClick={doSSO}
            disabled={autoStarting}
            style={{
              width: "100%", padding: "14px", borderRadius: 12,
              background: autoStarting ? "#6ee7b7" : "linear-gradient(135deg, #047857, #059669)",
              color: "#fff", border: "none", fontSize: 15, fontWeight: 700,
              cursor: autoStarting ? "wait" : "pointer",
              boxShadow: "0 4px 14px rgba(4, 120, 87, 0.25)",
            }}
          >
            {autoStarting ? "正在跳转到身份认证..." : "使用 Zitadel 登录 / 注册"}
          </button>

          <p style={{ marginTop: 20, marginBottom: 0, fontSize: 11, color: "#9ca3af", textAlign: "center", lineHeight: 1.5 }}>
            登录即表示同意《用户协议》与《隐私政策》
          </p>
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: "16px", fontSize: 11, color: "#9ca3af", position: "relative", zIndex: 1 }}>
        © 林草二十年 · 微信小店 · 花草如你所愿
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
