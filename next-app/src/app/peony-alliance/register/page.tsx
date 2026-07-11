"use client";
// 芍药联盟注册 — 4 步向导 (无短信 / 玻璃拟态 / 徽章成长)
// Route: /peony-alliance/register
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Alliance = "hq" | "branch" | "overseas" | "partner";
type Identity = "admin" | "staff";
type Position = "sales" | "operation" | "info" | "aftersales";

const ALLIANCE_OPTIONS: { key: Alliance; title: string; sub: string; emoji: string }[] = [
  { key: "hq",       title: "总部",       sub: "菏泽/曹州牡丹园",       emoji: "🏛" },
  { key: "branch",   title: "分部",       sub: "菏泽/洛阳/北京/云南/新疆", emoji: "🌸" },
  { key: "overseas", title: "海外用户",   sub: "全球芍药爱好者",         emoji: "🌍" },
  { key: "partner",  title: "海外合伙人", sub: "国际经销/展会",         emoji: "🤝" },
];
const POSITION_OPTIONS: { key: Position; label: string; emoji: string }[] = [
  { key: "sales",       label: "销售",   emoji: "💐" },
  { key: "operation",   label: "运营",   emoji: "🌱" },
  { key: "info",        label: "信息员", emoji: "📋" },
  { key: "aftersales",  label: "售后",   emoji: "💬" },
];
const SPECIES = ["芍药", "牡丹", "鲜切花", "种苗", "盆栽", "其他"];

// 徽章成长: 🌱 → 🌿 → 🌵 → 🌸 → 🌺 (5 级)
const BADGES = [
  { emoji: "🌱", name: "花开新芽", desc: "刚加入联盟，一切从这里开始" },
  { emoji: "🌿", name: "破土青苗", desc: "开始积累业务足迹" },
  { emoji: "🌵", name: "稳步成长", desc: "已有稳定业务贡献" },
  { emoji: "🌸", name: "含苞待放", desc: "接近核心贡献者" },
  { emoji: "🌺", name: "盛放联盟",  desc: "联盟骨干成员" },
];

export default function PeonyRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  // step 1
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  // step 2
  const [alliance, setAlliance] = useState<Alliance | null>(null);
  // step 3
  const [identity, setIdentity] = useState<Identity | null>(null);
  // step 4
  const [positions, setPositions] = useState<Position[]>([]);
  const [entityName, setEntityName] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [licenseUrl, setLicenseUrl] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [mainSpecies, setMainSpecies] = useState<string[]>([]);
  const [capacityMu, setCapacityMu] = useState<string>("");
  // submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<any>(null);

  const step1Ok = /^1\d{10}$/.test(phone) && password.length >= 6 && password === confirm;
  const step2Ok = !!alliance;
  const step3Ok = !!identity;
  const showInfo = positions.includes("info");
  const step4Ok = useMemo(() => {
    if (positions.length === 0) return false;
    if (identity === "admin" && !entityName.trim()) return false;
    if (showInfo && (mainSpecies.length === 0 || !capacityMu)) return false;
    if (identity === "staff" && !inviteCode.trim()) return false;
    return true;
  }, [positions, identity, entityName, showInfo, mainSpecies, capacityMu, inviteCode]);

  const togglePos = (p: Position) =>
    setPositions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const toggleSpecies = (s: string) =>
    setMainSpecies(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  async function handleSubmit() {
    setSubmitting(true); setError(null);
    try {
      const body: any = {
        phone, password,
        alliance_type: alliance,
        identity,
        positions,
      };
      if (identity === "admin") {
        body.org = {
          entity_name: entityName,
          office_province: province,
          office_city: city,
          office_district: district,
          office_address: address,
          business_license_url: licenseUrl,
        };
      }
      if (identity === "staff") body.invite_code = inviteCode.trim().toUpperCase();
      if (showInfo) {
        body.main_species = mainSpecies;
        body.capacity_mu = Number(capacityMu) || 0;
      }
      const r = await fetch("/api/peony-alliance/register-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "register_failed"); setSubmitting(false); return; }
      setDone(j);
    } catch (e: any) {
      setError(e?.message || "network_error");
    } finally { setSubmitting(false); }
  }

  if (done) return <SuccessCard result={done} onExplore={() => router.push("/")} />;

  return (
    <div className="peony-wrap">
      {/* 背景: 芍药 + 数字网络 */}
      <div className="peony-bg" aria-hidden />
      <div className="peony-network" aria-hidden />

      <div className="peony-glass">
        <header className="peony-header">
          <div className="peony-brand">🌸 芍药联盟</div>
          <div className="peony-step-dots">
            {[1,2,3,4].map(n => (
              <span key={n} className={`peony-dot ${n===step?"active":""} ${n<step?"done":""}`}>{n<step?"✓":n}</span>
            ))}
          </div>
        </header>

        {step === 1 && (
          <section className="peony-section">
            <h2>第一步 · 建立账户</h2>
            <p className="hint">手机号 + 密码即可，无需验证码。</p>
            <label>手机号</label>
            <input inputMode="numeric" maxLength={11} value={phone}
                   onChange={e => setPhone(e.target.value.replace(/\D/g,""))}
                   placeholder="请输入 11 位手机号" />
            <label>设置密码</label>
            <input type="password" value={password}
                   onChange={e => setPassword(e.target.value)}
                   placeholder="至少 6 位" />
            <label>确认密码</label>
            <input type="password" value={confirm}
                   onChange={e => setConfirm(e.target.value)}
                   placeholder="再输一次" />
            {password && confirm && password !== confirm && <div className="err">两次密码不一致</div>}
            <div className="actions">
              <button className="primary" disabled={!step1Ok} onClick={() => setStep(2)}>下一步 →</button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="peony-section">
            <h2>第二步 · 选择联盟身份</h2>
            <p className="hint">你的组织在联盟里的位置。</p>
            <div className="cards">
              {ALLIANCE_OPTIONS.map(o => (
                <button key={o.key} className={`card ${alliance===o.key?"picked":""}`} onClick={() => setAlliance(o.key)}>
                  <div className="card-emoji">{o.emoji}</div>
                  <div className="card-title">{o.title}</div>
                  <div className="card-sub">{o.sub}</div>
                </button>
              ))}
            </div>
            <div className="actions">
              <button onClick={() => setStep(1)}>← 返回</button>
              <button className="primary" disabled={!step2Ok} onClick={() => setStep(3)}>下一步 →</button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="peony-section">
            <h2>第三步 · 你的身份</h2>
            <p className="hint">管理员建立组织并等待审批；员工凭邀请码即刻加入。</p>
            <div className="cards two">
              <button className={`card big ${identity==="admin"?"picked":""}`} onClick={() => setIdentity("admin")}>
                <div className="card-emoji">👑</div>
                <div className="card-title">管理员 Admin</div>
                <div className="card-sub">建立组织 / 需要联盟审批</div>
              </button>
              <button className={`card big ${identity==="staff"?"picked":""}`} onClick={() => setIdentity("staff")}>
                <div className="card-emoji">👥</div>
                <div className="card-title">员工 Staff</div>
                <div className="card-sub">凭邀请码加入现有组织</div>
              </button>
            </div>
            <div className="actions">
              <button onClick={() => setStep(2)}>← 返回</button>
              <button className="primary" disabled={!step3Ok} onClick={() => setStep(4)}>下一步 →</button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="peony-section">
            <h2>第四步 · 岗位与资料</h2>
            <p className="hint">岗位可多选，选择"信息员"需补充主营品种和产能。</p>

            <label>岗位（可多选）</label>
            <div className="chip-row">
              {POSITION_OPTIONS.map(p => (
                <button key={p.key} className={`chip ${positions.includes(p.key)?"picked":""}`} onClick={() => togglePos(p.key)}>
                  <span className="chip-emoji">{p.emoji}</span>{p.label}
                </button>
              ))}
            </div>

            {identity === "admin" && (
              <>
                <label>组织主体名称 *</label>
                <input value={entityName} onChange={e => setEntityName(e.target.value)} placeholder="如：曹州牡丹园" />
                <label>办公地址</label>
                <div className="row3">
                  <input value={province} onChange={e => setProvince(e.target.value)} placeholder="省" />
                  <input value={city} onChange={e => setCity(e.target.value)} placeholder="市" />
                  <input value={district} onChange={e => setDistrict(e.target.value)} placeholder="区/县" />
                </div>
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="详细地址" />
                <label>营业执照 URL（可选）</label>
                <input value={licenseUrl} onChange={e => setLicenseUrl(e.target.value)} placeholder="MinIO 图片链接" />
              </>
            )}

            {identity === "staff" && (
              <>
                <label>邀请码 *</label>
                <input value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} placeholder="管理员提供的 6 位邀请码" />
              </>
            )}

            {showInfo && (
              <>
                <label>主营品种（可多选）*</label>
                <div className="chip-row">
                  {SPECIES.map(s => (
                    <button key={s} className={`chip ${mainSpecies.includes(s)?"picked":""}`} onClick={() => toggleSpecies(s)}>{s}</button>
                  ))}
                </div>
                <label>产能（亩）*</label>
                <input inputMode="numeric" value={capacityMu} onChange={e => setCapacityMu(e.target.value.replace(/\D/g,""))} placeholder="例如 200" />
              </>
            )}

            {error && <div className="err">注册失败：{error}</div>}
            <div className="actions">
              <button onClick={() => setStep(3)}>← 返回</button>
              <button className="primary" disabled={!step4Ok || submitting} onClick={handleSubmit}>
                {submitting ? "提交中…" : "完成注册 🌸"}
              </button>
            </div>
          </section>
        )}

        <footer className="peony-foot">
          <div className="badge-strip">
            {BADGES.map((b, i) => (
              <div key={i} className={`badge ${i===0?"current":""}`}>
                <div className="badge-emoji">{b.emoji}</div>
                <div className="badge-name">{b.name}</div>
              </div>
            ))}
          </div>
          <div className="footnote">加入即获得 🌱 花开新芽 · 随贡献成长为 🌺 盛放联盟</div>
        </footer>
      </div>

      <style jsx>{`
        .peony-wrap { position: relative; min-height: 100vh; overflow: hidden; padding: 32px 16px 80px;
          background: radial-gradient(1200px 800px at 10% 0%, #fff1f6 0%, transparent 60%),
                      radial-gradient(1000px 700px at 90% 100%, #f0fdf4 0%, transparent 55%),
                      linear-gradient(180deg, #fef7fb 0%, #fdfdff 100%); }
        .peony-bg { position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(closest-side, rgba(244,114,182,0.25), transparent) 12% 22%/280px 280px no-repeat,
                      radial-gradient(closest-side, rgba(244,114,182,0.20), transparent) 82% 30%/220px 220px no-repeat,
                      radial-gradient(closest-side, rgba(147,197,253,0.18), transparent) 30% 78%/260px 260px no-repeat; }
        .peony-network { position: absolute; inset: 0; pointer-events: none; opacity: 0.35;
          background-image:
            linear-gradient(rgba(4,120,87,0.10) 1px, transparent 1px),
            linear-gradient(90deg, rgba(4,120,87,0.10) 1px, transparent 1px);
          background-size: 32px 32px, 32px 32px; mask-image: radial-gradient(ellipse at 50% 40%, black 40%, transparent 75%); }
        .peony-glass { position: relative; max-width: 560px; margin: 0 auto; padding: 28px 24px 22px;
          background: rgba(255,255,255,0.55); backdrop-filter: blur(24px) saturate(1.1);
          -webkit-backdrop-filter: blur(24px) saturate(1.1);
          border: 1px solid rgba(255,255,255,0.7); border-radius: 24px;
          box-shadow: 0 20px 60px rgba(190,24,93,0.10), 0 4px 20px rgba(4,120,87,0.06); }
        .peony-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .peony-brand { font-weight: 800; font-size: 18px; background: linear-gradient(135deg,#be185d,#047857); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .peony-step-dots { display: flex; gap: 8px; }
        .peony-dot { width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.6); border: 1px solid rgba(190,24,93,0.15); color: #9ca3af; font-size: 12px; font-weight: 700; }
        .peony-dot.active { background: linear-gradient(135deg,#be185d,#f472b6); color: #fff; border-color: transparent; box-shadow: 0 4px 12px rgba(190,24,93,0.35); }
        .peony-dot.done { background: linear-gradient(135deg,#047857,#10b981); color: #fff; border-color: transparent; }
        .peony-section h2 { margin: 6px 0 2px; color: #831843; font-size: 18px; }
        .peony-section .hint { color: #6b7280; font-size: 12.5px; margin: 0 0 14px; }
        label { display: block; font-size: 12px; font-weight: 600; color: #4b5563; margin: 10px 0 4px; }
        input { width: 100%; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(190,24,93,0.15);
          background: rgba(255,255,255,0.85); font-size: 14px; outline: none; transition: border .15s, box-shadow .15s; }
        input:focus { border-color: #f472b6; box-shadow: 0 0 0 3px rgba(244,114,182,0.15); }
        .row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
        .row3 input { margin-bottom: 6px; }
        .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 6px; }
        .cards.two { grid-template-columns: 1fr 1fr; }
        .card { padding: 14px 12px; background: rgba(255,255,255,0.7); border: 1.5px solid rgba(190,24,93,0.10);
          border-radius: 16px; text-align: left; cursor: pointer; transition: all .15s; }
        .card:hover { transform: translateY(-2px); }
        .card.picked { border-color: #f472b6; background: linear-gradient(135deg, rgba(244,114,182,0.14), rgba(255,255,255,0.85)); box-shadow: 0 8px 24px rgba(190,24,93,0.15); }
        .card.big { padding: 22px 14px; }
        .card-emoji { font-size: 26px; }
        .card-title { font-weight: 700; color: #831843; margin-top: 4px; font-size: 14px; }
        .card-sub { color: #6b7280; font-size: 11.5px; margin-top: 2px; }
        .chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 2px 0 4px; }
        .chip { padding: 7px 12px; border-radius: 999px; border: 1px solid rgba(4,120,87,0.15); background: rgba(255,255,255,0.75);
          font-size: 13px; color: #374151; cursor: pointer; transition: all .15s; }
        .chip:hover { transform: translateY(-1px); }
        .chip.picked { background: linear-gradient(135deg, #047857, #10b981); color: #fff; border-color: transparent; box-shadow: 0 4px 12px rgba(4,120,87,0.25); }
        .chip-emoji { margin-right: 4px; }
        .actions { display: flex; justify-content: space-between; gap: 10px; margin-top: 20px; }
        .actions button { flex: 1; padding: 11px 14px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.06); background: rgba(255,255,255,0.7); font-weight: 600; cursor: pointer; }
        .actions .primary { background: linear-gradient(135deg,#be185d,#f472b6); color: #fff; border-color: transparent; box-shadow: 0 6px 20px rgba(190,24,93,0.28); }
        .actions .primary:disabled { background: #e5e7eb; color: #9ca3af; box-shadow: none; cursor: not-allowed; }
        .err { color: #b91c1c; font-size: 12px; margin-top: 8px; }
        .peony-foot { margin-top: 22px; padding-top: 16px; border-top: 1px dashed rgba(190,24,93,0.15); }
        .badge-strip { display: flex; justify-content: space-between; gap: 6px; }
        .badge { flex: 1; text-align: center; padding: 6px 4px; border-radius: 12px; opacity: 0.55; }
        .badge.current { opacity: 1; background: linear-gradient(135deg, rgba(244,114,182,0.12), rgba(4,120,87,0.10)); box-shadow: inset 0 0 0 1px rgba(190,24,93,0.15); }
        .badge-emoji { font-size: 22px; }
        .badge-name { font-size: 10.5px; color: #6b7280; margin-top: 2px; }
        .footnote { text-align: center; font-size: 11px; color: #9ca3af; margin-top: 10px; }
      `}</style>
    </div>
  );
}

function SuccessCard({ result, onExplore }: { result: any; onExplore: () => void }) {
  const badge = result?.registration?.badge || { emoji: "🌱", name: "花开新芽" };
  const zOrg = result?.registration?.zitadel_org_id;
  return (
    <div style={{ minHeight: "100vh", padding: "60px 20px", background: "linear-gradient(180deg,#fef7fb,#f0fdf4)" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.6)", borderRadius: 24, padding: "40px 28px", textAlign: "center",
        boxShadow: "0 20px 60px rgba(190,24,93,0.15)" }}>
        <div style={{ fontSize: 72, marginBottom: 10 }}>{badge.emoji}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#831843" }}>欢迎加入芍药联盟</div>
        <div style={{ marginTop: 6, color: "#6b7280", fontSize: 13 }}>
          你获得了徽章 <b>{badge.name}</b>
        </div>
        <div style={{ marginTop: 20, padding: "12px 14px", background: "rgba(255,255,255,0.6)", borderRadius: 14, fontSize: 12, color: "#374151" }}>
          注册 ID: {result?.registration?.id}<br />
          组织: {zOrg || "待建"}<br />
          Zitadel 用户: {result?.registration?.zitadel_user_id || "同步中"}
        </div>
        <button onClick={onExplore} style={{ marginTop: 24, padding: "12px 28px", borderRadius: 999,
          background: "linear-gradient(135deg,#be185d,#f472b6)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer",
          boxShadow: "0 8px 24px rgba(190,24,93,0.28)" }}>
          🌸 进入新人首页
        </button>
      </div>
    </div>
  );
}
