"use client";
// /login — Zitadel OIDC-only 单点登录/注册
// 进来立即 startSSO 302 到 Zitadel Hosted Login UI, 不显示中间点击页
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { startSSO } from "@/lib/sso";

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { user } = useAuth();
  const redirect = sp?.get("redirect") || sp?.get("callbackUrl") || "/";
  const errCode = sp?.get("error") || "";
  const startedRef = useRef(false);
  const [status, setStatus] = useState<string>("正在打开 Zitadel 单点登录…");

  // 已登录用户: 直接回跳, 不进 SSO
  useEffect(() => {
    if (!user) return;
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
  }, [user, redirect, router]);

  // 未登录 & 无错误: 自动开始 SSO (仅一次)
  useEffect(() => {
    if (user || errCode || startedRef.current) return;
    startedRef.current = true;
    startSSO(redirect).catch((e) => {
      console.error("[login] startSSO failed:", e);
      setStatus("跳转失败, 请刷新页面重试");
    });
  }, [user, errCode, redirect]);

  // 有错误码 / 或跳转失败时才显示可点按钮
  const showFallback = Boolean(errCode) || status.startsWith("跳转失败");

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 40%, #f0fdf4 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 380, background: "#ffffff", borderRadius: 20,
        padding: "36px 30px",
        boxShadow: "0 10px 40px rgba(4, 120, 87, 0.08)",
        border: "1px solid #d1fae5",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>🌿</div>
        <div style={{ fontWeight: 800, color: "#047857", fontSize: 17 }}>植物收藏家 · 林草二十年</div>
        <div style={{ marginTop: 20, marginBottom: 20, fontSize: 13, color: "#6b7280", minHeight: 40 }}>
          {showFallback ? (errCode ? `登录失败: ${errCode}` : status) : (
            <>
              <div style={{
                width: 22, height: 22, margin: "0 auto 10px",
                border: "3px solid #d1fae5", borderTopColor: "#047857",
                borderRadius: "50%", animation: "spin 0.8s linear infinite",
              }} />
              {status}
            </>
          )}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
        {showFallback && (
          <button
            onClick={() => { setStatus("正在打开 Zitadel 单点登录…"); startSSO(redirect); }}
            style={{
              width: "100%", padding: "12px", borderRadius: 12,
              background: "linear-gradient(135deg, #047857, #059669)",
              color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}
          >
            重新登录 / 注册
          </button>
        )}
      </div>
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
