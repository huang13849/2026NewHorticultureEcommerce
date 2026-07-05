"use client";
// /login — Zitadel OIDC-only 单点登录/注册
// 无脑立即发 SSO. 已登录的用户会被 Zitadel 用 session cookie 静默返回 -> callback -> 首页.
// 这样避免 auth-context 用旧 flower_token 乐观还原时把用户困在"看似已登录但按钮无响应"的坑里.
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { startSSO } from "@/lib/sso";

function LoginInner() {
  const sp = useSearchParams();
  const redirect = sp?.get("redirect") || sp?.get("callbackUrl") || "/";
  const errCode = sp?.get("error") || "";
  const startedRef = useRef(false);
  const [status, setStatus] = useState<string>("正在打开 Zitadel 单点登录…");

  // 无脑立即 SSO. 有 error 时才停下. 只跑一次.
  useEffect(() => {
    if (errCode || startedRef.current) return;
    startedRef.current = true;
    startSSO(redirect).catch((e) => {
      console.error("[login] startSSO failed:", e);
      setStatus("跳转失败, 请刷新页面重试");
    });
  }, [errCode, redirect]);

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
            onClick={() => { setStatus("正在打开 Zitadel 单点登录…"); startedRef.current = false; startSSO(redirect); }}
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
