"use client";
// /login - 自建植物风单页登录 (方案 X)
// 特性:
// - 左上角 logo "植物收藏家"
// - 单页表单: 手机号 + 密码/验证码切换
// - 微信登录占位按钮 (未来接 wx-open)
// - 注册 = 手机号 + 验证码, 后端 auto-create user
// - 登录后写 localStorage.flower_token, 触发 AuthContext 恢复登录态

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { user, login } = useAuth();
  const redirect = sp?.get("redirect") || "/";

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"password" | "code">("code");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [codeSending, setCodeSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (user) router.replace(redirect);
  }, [user, redirect, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function sendCode() {
    setErr("");
    if (!/^1[3-9]\d{9}$/.test(phone)) { setErr("请输入正确的手机号"); return; }
    setCodeSending(true);
    try {
      const r = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "发送失败");
      setCodeSent(true);
      setCooldown(60);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "发送失败");
    } finally {
      setCodeSending(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!/^1[3-9]\d{9}$/.test(phone)) { setErr("请输入正确的手机号"); return; }
    setLoading(true);
    try {
      if (mode === "password") {
        if (!password) throw new Error("请输入密码");
        await login(phone, undefined, password);
      } else {
        if (!code) throw new Error("请输入验证码");
        await login(phone, code);
      }
      router.replace(redirect);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  function wxLogin() {
    setErr("微信登录即将上线，请先使用手机号");
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 40%, #f0fdf4 100%)",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* 左上角 logo */}
      <header style={{ padding: "18px 28px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 28 }}>🌿</span>
        <div>
          <div style={{ fontWeight: 800, color: "#047857", fontSize: 17, lineHeight: 1.1 }}>植物收藏家</div>
          <div style={{ fontSize: 10, color: "#065f46", opacity: 0.75 }}>Plant Collector · 林草二十年</div>
        </div>
      </header>

      {/* 花草点缀背景 */}
      <div style={{ position: "absolute", top: 60, right: -40, fontSize: 200, opacity: 0.08, pointerEvents: "none" }}>🌸</div>
      <div style={{ position: "absolute", bottom: -20, left: -30, fontSize: 180, opacity: 0.08, pointerEvents: "none" }}>🌱</div>

      {/* 主内容 */}
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", position: "relative", zIndex: 1 }}>
        <div style={{
          width: "100%",
          maxWidth: 400,
          background: "#ffffff",
          borderRadius: 20,
          padding: "32px 28px",
          boxShadow: "0 10px 40px rgba(4, 120, 87, 0.08), 0 2px 8px rgba(0,0,0,0.03)",
          border: "1px solid #d1fae5",
        }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#111827" }}>欢迎回来</h1>
          <p style={{ marginTop: 6, marginBottom: 22, fontSize: 13, color: "#6b7280" }}>
            {mode === "code" ? "手机号 + 验证码，未注册将自动开通" : "使用手机号 + 密码登录"}
          </p>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* phone */}
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>手机号</span>
              <input
                type="tel" autoComplete="tel" inputMode="numeric" maxLength={11}
                value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="请输入 11 位手机号"
                style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 15, outline: "none" }}
                required
              />
            </label>

            {/* password or code */}
            {mode === "password" ? (
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>密码</span>
                <input
                  type="password" autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 15, outline: "none" }}
                  required
                />
              </label>
            ) : (
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>验证码</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text" inputMode="numeric" maxLength={6}
                    value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="6 位验证码"
                    style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 15, outline: "none" }}
                    required
                  />
                  <button
                    type="button" onClick={sendCode} disabled={codeSending || cooldown > 0}
                    style={{
                      padding: "0 14px", borderRadius: 10,
                      background: cooldown > 0 ? "#e5e7eb" : "#ecfdf5",
                      color: cooldown > 0 ? "#9ca3af" : "#047857",
                      border: "1px solid " + (cooldown > 0 ? "#e5e7eb" : "#a7f3d0"),
                      fontSize: 13, fontWeight: 600, cursor: cooldown > 0 ? "not-allowed" : "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    {codeSending ? "发送中" : cooldown > 0 ? `${cooldown}s 后重发` : (codeSent ? "重新发送" : "获取验证码")}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: "#059669", margin: "2px 0 0 2px" }}>💡 提示：当前测试环境万能码 <b>123456</b></p>
              </label>
            )}

            {err && (
              <div style={{ fontSize: 12, color: "#dc2626", background: "#fef2f2", padding: "8px 12px", borderRadius: 8 }}>{err}</div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                marginTop: 6, padding: "13px", borderRadius: 12,
                background: "linear-gradient(135deg, #047857, #059669)",
                color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 14px rgba(4, 120, 87, 0.25)",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "登录中..." : (mode === "code" ? "登录 / 注册" : "登录")}
            </button>

            {/* 切换 mode */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
              <button
                type="button" onClick={() => { setMode(mode === "code" ? "password" : "code"); setErr(""); }}
                style={{ background: "none", border: "none", color: "#047857", cursor: "pointer", padding: 0 }}
              >
                {mode === "code" ? "使用密码登录" : "使用验证码登录 / 注册"}
              </button>
              {mode === "password" && (
                <button type="button" onClick={() => { setMode("code"); setErr(""); }} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", padding: 0 }}>
                  忘记密码?
                </button>
              )}
            </div>
          </form>

          {/* divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0 16px" }}>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }}></div>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>其他登录方式</span>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }}></div>
          </div>

          {/* 第三方 */}
          <button
            type="button" onClick={wxLogin}
            style={{
              width: "100%", padding: "12px", borderRadius: 12, background: "#07C160",
              color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>💬</span> 微信登录
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
