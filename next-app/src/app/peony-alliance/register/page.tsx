"use client";
// 芍药联盟注册 — 4 步向导
// Route: /peony-alliance/register
// Design principles:
//   1. 大气雍容 · 国花气质（Peony gradient · gold-rimmed cards · floating petals）
//   2. Framer-motion-free animations（pure CSS keyframes + Tailwind-like utility inline styles → CF-friendly SSR）
//   3. i18n via @/lib/i18n/context — key: peonyRegister.*  (zh/en/ja/de/fr/ar/ru)
//   4. 无短信验证；浏览器密码不保存则拒绝注册
//   5. 徽章 🌱→🌿→🌵→🌸→🌺 五级成长可视化预览
//
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";

type Alliance = "hq" | "branch" | "overseas" | "partner";
type Identity = "admin" | "staff";
type Position = "sales" | "operation" | "info" | "aftersales";

const BADGES = [
  { emoji: "🌱", key: "seedling" },
  { emoji: "🌿", key: "sprout" },
  { emoji: "🌵", key: "rooted" },
  { emoji: "🌸", key: "budding" },
  { emoji: "🌺", key: "bloom" },
];

// ---------- Password credential helpers (强制浏览器保存密码) ----------
type CredMgr = {
  create: (init: { password: PasswordCredentialInit }) => Promise<Credential | null>;
  store: (c: Credential) => Promise<Credential>;
};
type PasswordCredentialInit = { id: string; password: string; name?: string };
function getCreds(): CredMgr | null {
  if (typeof navigator === "undefined") return null;
  const c = (navigator as Navigator & { credentials?: CredMgr }).credentials;
  if (!c || typeof c.create !== "function" || typeof c.store !== "function") return null;
  // PasswordCredential itself must exist
  if (typeof (window as unknown as { PasswordCredential?: unknown }).PasswordCredential === "undefined") return null;
  return c;
}

export default function PeonyRegisterPage() {
  const router = useRouter();
  const { t, lang } = useI18n();

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pwSaveError, setPwSaveError] = useState<string | null>(null);

  // form state
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [alliance, setAlliance] = useState<Alliance | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [entityName, setEntityName] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [mainSpecies, setMainSpecies] = useState<string[]>([]);
  const [capacityMu, setCapacityMu] = useState("");

  const [ackPwSave, setAckPwSave] = useState(false);

  const canNextStep1 = phone.length >= 8 && password.length >= 6 && password === confirm && ackPwSave;
  const canNextStep2 = alliance !== null;
  const canNextStep3 = identity !== null;
  const canSubmit = useMemo(() => {
    if (!canNextStep1 || !canNextStep2 || !canNextStep3) return false;
    if (positions.length === 0) return false;
    if (identity === "admin" && !entityName.trim()) return false;
    if (identity === "staff" && !inviteCode.trim()) return false;
    return true;
  }, [canNextStep1, canNextStep2, canNextStep3, positions, identity, entityName, inviteCode]);

  // Petal decorations (fixed positions to avoid hydration mismatch)
  const petals = useMemo(
    () => [
      { top: "8%",  left: "6%",  size: 44, delay: "0s",   dur: "18s" },
      { top: "22%", left: "88%", size: 32, delay: "2.5s", dur: "22s" },
      { top: "62%", left: "4%",  size: 28, delay: "5s",   dur: "20s" },
      { top: "78%", left: "82%", size: 40, delay: "1s",   dur: "24s" },
      { top: "42%", left: "50%", size: 24, delay: "3.5s", dur: "26s" },
    ],
    []
  );

  const submit = async () => {
    setError(null);
    setPwSaveError(null);
    if (!canSubmit) return;
    setBusy(true);

    // 1) 强制浏览器保存密码 — 失败即中止
    const creds = getCreds();
    if (!creds) {
      setPwSaveError(t("peonyRegister.pwSaveUnsupported"));
      setBusy(false);
      return;
    }
    let cred: Credential | null = null;
    try {
      const PC = (window as unknown as { PasswordCredential: new (i: PasswordCredentialInit) => Credential }).PasswordCredential;
      cred = new PC({ id: phone, password, name: `芍药联盟 ${phone}` });
      await creds.store(cred);
    } catch (e) {
      setPwSaveError(t("peonyRegister.pwSaveFailed") + " · " + (e as Error).message);
      setBusy(false);
      return;
    }

    // 2) 提交注册
    try {
      const body = {
        phone,
        password,
        alliance_type: alliance,
        identity,
        positions,
        main_species: mainSpecies,
        capacity_mu: capacityMu ? Number(capacityMu) : null,
        ...(identity === "admin"
          ? {
              org: {
                entity_name: entityName,
                office_province: province,
                office_city: city,
                office_district: district,
                office_address: address,
                business_license_url: "",
              },
            }
          : { invite_code: inviteCode.toUpperCase() }),
      };
      const r = await fetch("/api/peony-alliance/register-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(t("peonyRegister.submitFailed") + ": " + (j.error || j.detail?.message || r.status));
        setBusy(false);
        return;
      }
      // success — persist JWT and land on peony home
      if (j.token) {
        try {
          localStorage.setItem("peony.token", j.token);
          localStorage.setItem("peony.user", JSON.stringify(j.user));
        } catch {}
      }
      setStep(5); // celebration
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{
      minHeight: "100vh", position: "relative", overflow: "hidden",
      // 芍药雍容: 深绯 → 藤紫 → 金 → 珍珠白
      background: "radial-gradient(1200px 800px at 20% 10%, #4a0e2b 0%, transparent 60%), radial-gradient(1000px 700px at 90% 90%, #2d1655 0%, transparent 55%), linear-gradient(160deg, #1a0a1f 0%, #2b0f36 45%, #4a1a48 100%)",
      fontFamily: "'Noto Serif SC','Cormorant Garamond',serif",
      color: "#fefbf7",
    }}>
      {/* Animated floating petals */}
      {petals.map((p, i) => (
        <div key={i} style={{
          position: "absolute", top: p.top, left: p.left, width: p.size, height: p.size,
          fontSize: p.size, opacity: 0.35, pointerEvents: "none",
          animation: `peonyDrift ${p.dur} ease-in-out ${p.delay} infinite`,
          filter: "blur(0.2px)",
        }}>🌸</div>
      ))}

      {/* Gold ambient glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(circle at 50% 0%, rgba(255,215,150,0.15) 0%, transparent 40%)",
      }} />

      <main style={{
        maxWidth: 720, margin: "0 auto", padding: "56px 20px 80px",
        position: "relative", zIndex: 1,
      }}>
        {/* Hero */}
        <header style={{ textAlign: "center", marginBottom: 40, animation: "peonyFadeDown .8s ease" }}>
          <div style={{
            fontSize: 72, lineHeight: 1, filter: "drop-shadow(0 10px 30px rgba(255,150,200,0.5))",
            animation: "peonyBreath 4s ease-in-out infinite",
          }}>🌸</div>
          <h1 style={{
            fontSize: 44, fontWeight: 700, margin: "16px 0 8px",
            background: "linear-gradient(135deg, #fce3ec 0%, #f7a8c8 30%, #ffd89b 60%, #f7a8c8 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
            letterSpacing: "0.02em",
          }}>{t("peonyRegister.title")}</h1>
          <p style={{ margin: 0, fontSize: 16, color: "#e8d5e0", letterSpacing: "0.05em" }}>
            {t("peonyRegister.subtitle")}
          </p>
          <div style={{
            marginTop: 16, height: 1,
            background: "linear-gradient(90deg, transparent 0%, #d4a574 50%, transparent 100%)",
          }} />
        </header>

        {/* Stepper */}
        {step <= 4 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 32 }}>
            {[1, 2, 3, 4].map((s) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 600,
                  background: s <= step
                    ? "linear-gradient(135deg,#ec4899 0%,#a855f7 100%)"
                    : "rgba(255,255,255,0.1)",
                  color: s <= step ? "#fff" : "rgba(255,255,255,0.4)",
                  border: s === step ? "2px solid #ffd89b" : "2px solid transparent",
                  boxShadow: s === step ? "0 0 24px rgba(255,216,155,0.5)" : "none",
                  transition: "all .3s",
                }}>{s}</div>
                {s < 4 && <div style={{
                  width: 32, height: 2,
                  background: s < step ? "#ec4899" : "rgba(255,255,255,0.15)",
                  transition: "background .3s",
                }} />}
              </div>
            ))}
          </div>
        )}

        {/* Card — glass */}
        <section style={{
          background: "linear-gradient(160deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,216,155,0.25)",
          borderRadius: 24, padding: 32,
          boxShadow: "0 24px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1)",
          animation: "peonyFadeUp .6s ease",
        }}>
          {/* ============== STEP 1: 账号 ============== */}
          {step === 1 && (
            <>
              <StepTitle text={t("peonyRegister.step1.title")} sub={t("peonyRegister.step1.sub")} />
              <FormRow label={t("peonyRegister.step1.phone")}>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 15))}
                  autoComplete="tel username webauthn"
                  inputMode="numeric"
                  placeholder={t("peonyRegister.step1.phonePh")}
                  style={inputStyle}
                />
              </FormRow>
              <FormRow label={t("peonyRegister.step1.password")}>
                <input
                  type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder={t("peonyRegister.step1.passwordPh")}
                  style={inputStyle}
                />
              </FormRow>
              <FormRow label={t("peonyRegister.step1.confirm")}>
                <input
                  type="password" value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder={t("peonyRegister.step1.confirmPh")}
                  style={inputStyle}
                />
                {confirm && confirm !== password && (
                  <div style={hintErr}>{t("peonyRegister.step1.mismatch")}</div>
                )}
              </FormRow>
              <label style={{
                display: "flex", alignItems: "flex-start", gap: 10, padding: 14,
                marginTop: 8,
                background: "rgba(255,216,155,0.08)",
                border: "1px solid rgba(255,216,155,0.25)",
                borderRadius: 12, cursor: "pointer",
              }}>
                <input
                  type="checkbox" checked={ackPwSave}
                  onChange={(e) => setAckPwSave(e.target.checked)}
                  style={{ marginTop: 4, accentColor: "#ec4899" }}
                />
                <span style={{ fontSize: 13, lineHeight: 1.6, color: "#f5e8dd" }}>
                  🔐 {t("peonyRegister.step1.pwSaveAck")}
                </span>
              </label>
            </>
          )}

          {/* ============== STEP 2: 联盟归属 ============== */}
          {step === 2 && (
            <>
              <StepTitle text={t("peonyRegister.step2.title")} sub={t("peonyRegister.step2.sub")} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {(["hq", "branch", "overseas", "partner"] as Alliance[]).map((k) => (
                  <ChoiceCard
                    key={k} selected={alliance === k}
                    onClick={() => setAlliance(k)}
                    emoji={t(`peonyRegister.alliance.${k}.emoji`)}
                    title={t(`peonyRegister.alliance.${k}.title`)}
                    sub={t(`peonyRegister.alliance.${k}.sub`)}
                  />
                ))}
              </div>
            </>
          )}

          {/* ============== STEP 3: 身份 ============== */}
          {step === 3 && (
            <>
              <StepTitle text={t("peonyRegister.step3.title")} sub={t("peonyRegister.step3.sub")} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {(["admin", "staff"] as Identity[]).map((k) => (
                  <ChoiceCard
                    key={k} selected={identity === k}
                    onClick={() => setIdentity(k)}
                    emoji={t(`peonyRegister.identity.${k}.emoji`)}
                    title={t(`peonyRegister.identity.${k}.title`)}
                    sub={t(`peonyRegister.identity.${k}.sub`)}
                  />
                ))}
              </div>
            </>
          )}

          {/* ============== STEP 4: 详情 ============== */}
          {step === 4 && (
            <>
              <StepTitle text={t("peonyRegister.step4.title")} sub={t("peonyRegister.step4.sub")} />

              {/* Positions */}
              <FormRow label={t("peonyRegister.step4.positions")}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {(["sales", "operation", "info", "aftersales"] as Position[]).map((p) => {
                    const on = positions.includes(p);
                    return (
                      <button
                        type="button" key={p}
                        onClick={() => setPositions(on
                          ? positions.filter((x) => x !== p)
                          : [...positions, p])}
                        style={chipStyle(on)}
                      >
                        <span style={{ fontSize: 20 }}>{t(`peonyRegister.position.${p}.emoji`)}</span>
                        <span>{t(`peonyRegister.position.${p}.label`)}</span>
                      </button>
                    );
                  })}
                </div>
              </FormRow>

              {identity === "admin" ? (
                <>
                  <FormRow label={t("peonyRegister.step4.entity")}>
                    <input value={entityName} onChange={(e) => setEntityName(e.target.value)} placeholder={t("peonyRegister.step4.entityPh")} style={inputStyle} />
                  </FormRow>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <input value={province} onChange={(e) => setProvince(e.target.value)} placeholder={t("peonyRegister.step4.province")} style={inputStyle} />
                    <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("peonyRegister.step4.city")} style={inputStyle} />
                    <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder={t("peonyRegister.step4.district")} style={inputStyle} />
                  </div>
                  <FormRow label={t("peonyRegister.step4.address")}>
                    <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t("peonyRegister.step4.addressPh")} style={inputStyle} />
                  </FormRow>
                  <FormRow label={t("peonyRegister.step4.species")}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {["peony", "moutan", "cutflower", "seedling", "potted", "other"].map((k) => {
                        const on = mainSpecies.includes(k);
                        return (
                          <button
                            type="button" key={k}
                            onClick={() => setMainSpecies(on ? mainSpecies.filter((x) => x !== k) : [...mainSpecies, k])}
                            style={chipStyle(on)}
                          >{t(`peonyRegister.species.${k}`)}</button>
                        );
                      })}
                    </div>
                  </FormRow>
                  <FormRow label={t("peonyRegister.step4.capacity")}>
                    <input type="number" min={0} value={capacityMu} onChange={(e) => setCapacityMu(e.target.value)} placeholder={t("peonyRegister.step4.capacityPh")} style={inputStyle} />
                  </FormRow>
                </>
              ) : (
                <FormRow label={t("peonyRegister.step4.inviteCode")}>
                  <input
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase().slice(0, 12))}
                    placeholder={t("peonyRegister.step4.inviteCodePh")}
                    style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: "0.3em", textAlign: "center", fontSize: 22 }}
                  />
                </FormRow>
              )}
            </>
          )}

          {/* ============== STEP 5: 庆祝 ============== */}
          {step === 5 && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{
                fontSize: 96, animation: "peonyBloom 1.2s cubic-bezier(.34,1.56,.64,1)",
                filter: "drop-shadow(0 12px 40px rgba(255,150,200,0.7))",
              }}>🌱</div>
              <h2 style={{
                marginTop: 20, fontSize: 32,
                background: "linear-gradient(135deg,#fce3ec 0%,#ffd89b 100%)",
                WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
              }}>{t("peonyRegister.done.title")}</h2>
              <p style={{ marginTop: 8, color: "#e8d5e0" }}>{t("peonyRegister.done.sub")}</p>

              {/* Badge growth path */}
              <div style={{ marginTop: 32, marginBottom: 24, display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
                {BADGES.map((b, i) => (
                  <div key={b.key} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    opacity: i === 0 ? 1 : 0.4,
                    animation: `peonyPop .4s ease ${0.3 + i * 0.15}s both`,
                  }}>
                    <div style={{
                      fontSize: 36,
                      filter: i === 0 ? "drop-shadow(0 4px 12px rgba(255,150,200,0.6))" : "grayscale(0.6)",
                    }}>{b.emoji}</div>
                    <div style={{ fontSize: 11, color: "#d4b8c8" }}>{t(`peonyRegister.badge.${b.key}`)}</div>
                    {i < BADGES.length - 1 && (
                      <div style={{ position: "absolute", opacity: 0 }}>→</div>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={() => router.push("/peony")} style={{ ...primaryBtn, marginTop: 16 }}>
                {t("peonyRegister.done.enter")} →
              </button>
            </div>
          )}

          {/* Error banners */}
          {(error || pwSaveError) && step <= 4 && (
            <div style={{
              marginTop: 20, padding: 14, borderRadius: 12,
              background: "rgba(220,80,110,0.15)",
              border: "1px solid rgba(220,80,110,0.35)",
              color: "#ffc9d4", fontSize: 13,
            }}>
              ⚠️ {pwSaveError || error}
            </div>
          )}

          {/* Nav buttons */}
          {step >= 1 && step <= 4 && (
            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              {step > 1 && (
                <button onClick={() => { setStep(step - 1); setError(null); setPwSaveError(null); }} style={ghostBtn} disabled={busy}>
                  ← {t("peonyRegister.back")}
                </button>
              )}
              {step < 4 && (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={
                    (step === 1 && !canNextStep1) ||
                    (step === 2 && !canNextStep2) ||
                    (step === 3 && !canNextStep3)
                  }
                  style={primaryBtn}
                >{t("peonyRegister.next")} →</button>
              )}
              {step === 4 && (
                <button onClick={submit} disabled={!canSubmit || busy} style={primaryBtn}>
                  {busy ? t("peonyRegister.submitting") : `🌸 ${t("peonyRegister.submit")}`}
                </button>
              )}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer style={{ textAlign: "center", marginTop: 32, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
          {t("peonyRegister.footer")}
        </footer>
      </main>

      <style jsx>{`
        @keyframes peonyDrift {
          0%   { transform: translate(0, 0) rotate(0); }
          33%  { transform: translate(30px, -40px) rotate(120deg); }
          66%  { transform: translate(-20px, 30px) rotate(240deg); }
          100% { transform: translate(0, 0) rotate(360deg); }
        }
        @keyframes peonyBreath {
          0%,100% { transform: scale(1); }
          50%     { transform: scale(1.08); }
        }
        @keyframes peonyFadeDown {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes peonyFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes peonyPop {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 0.4; transform: scale(1); }
        }
        @keyframes peonyBloom {
          0%   { transform: scale(0.3) rotate(-30deg); opacity: 0; }
          60%  { transform: scale(1.2) rotate(10deg); }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        input:focus { outline: none; border-color: #ec4899 !important; box-shadow: 0 0 0 3px rgba(236,72,153,0.2) !important; }
        button:not(:disabled):hover { transform: translateY(-1px); }
        button:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

// ---------- style objects ----------
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,216,155,0.2)",
  borderRadius: 10, color: "#fefbf7",
  fontSize: 15, transition: "all .2s", fontFamily: "inherit",
};
const primaryBtn: React.CSSProperties = {
  flex: 1, padding: "14px 24px",
  background: "linear-gradient(135deg,#ec4899 0%,#a855f7 60%,#d4a574 100%)",
  color: "#fff", fontWeight: 600, fontSize: 15,
  border: "none", borderRadius: 12, cursor: "pointer",
  boxShadow: "0 8px 24px rgba(236,72,153,0.4)",
  transition: "all .2s",
};
const ghostBtn: React.CSSProperties = {
  padding: "14px 20px",
  background: "rgba(255,255,255,0.06)",
  color: "#fefbf7", fontSize: 14,
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 12, cursor: "pointer",
  transition: "all .2s",
};
const hintErr: React.CSSProperties = { marginTop: 6, fontSize: 12, color: "#ffb0c0" };

function chipStyle(on: boolean): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 6,
    padding: "10px 14px", borderRadius: 10,
    fontSize: 14, fontFamily: "inherit", cursor: "pointer",
    background: on ? "linear-gradient(135deg,#ec4899 0%,#a855f7 100%)" : "rgba(255,255,255,0.06)",
    color: on ? "#fff" : "#e8d5e0",
    border: on ? "1px solid rgba(255,216,155,0.5)" : "1px solid rgba(255,255,255,0.12)",
    boxShadow: on ? "0 6px 18px rgba(236,72,153,0.35)" : "none",
    transition: "all .2s",
  };
}

// ---------- reusable pieces ----------
function StepTitle({ text, sub }: { text: string; sub: string }) {
  return (
    <div style={{ marginBottom: 24, textAlign: "center" }}>
      <h2 style={{
        margin: 0, fontSize: 26, fontWeight: 600,
        background: "linear-gradient(135deg,#fce3ec 0%,#ffd89b 100%)",
        WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
      }}>{text}</h2>
      <p style={{ marginTop: 6, marginBottom: 0, fontSize: 13, color: "#c8b5be", letterSpacing: "0.02em" }}>{sub}</p>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, color: "#d4b8c8", marginBottom: 6, letterSpacing: "0.03em" }}>{label}</label>
      {children}
    </div>
  );
}

function ChoiceCard({ selected, onClick, emoji, title, sub }: {
  selected: boolean; onClick: () => void; emoji: string; title: string; sub: string;
}) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: "22px 16px", textAlign: "center", cursor: "pointer",
      background: selected
        ? "linear-gradient(160deg, rgba(236,72,153,0.25) 0%, rgba(168,85,247,0.2) 100%)"
        : "rgba(255,255,255,0.04)",
      border: selected ? "1.5px solid #ffd89b" : "1px solid rgba(255,255,255,0.1)",
      borderRadius: 14, color: "#fefbf7", fontFamily: "inherit",
      boxShadow: selected ? "0 10px 30px rgba(236,72,153,0.3), inset 0 1px 0 rgba(255,216,155,0.3)" : "none",
      transition: "all .25s cubic-bezier(.34,1.56,.64,1)",
      transform: selected ? "translateY(-2px)" : "none",
    }}>
      <div style={{ fontSize: 36, marginBottom: 8, filter: selected ? "drop-shadow(0 4px 12px rgba(255,216,155,0.5))" : "none" }}>{emoji}</div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#c8b5be", lineHeight: 1.4 }}>{sub}</div>
    </button>
  );
}
