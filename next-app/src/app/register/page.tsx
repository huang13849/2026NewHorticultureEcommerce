// /register — 简单邮箱+密码注册，落到 Shop Club instance
// 成功后自动打「植物收藏家」标签
export const dynamic = 'force-dynamic';

type SP = { redirect?: string; error?: string; ok?: string };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = (await searchParams) || {};
  const redirect = sp.redirect || '/';
  const err = sp.error || '';
  const ok = sp.ok || '';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 15% 10%, #fee2e2 0%, transparent 25%), radial-gradient(circle at 85% 15%, #dcfce7 0%, transparent 28%), linear-gradient(135deg, #fff7ed 0%, #f0fdf4 55%, #fef2f2 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <form
        method="POST"
        action="/api/auth/register-collector"
        style={{
          width: '100%', maxWidth: 420, background: '#ffffff', borderRadius: 24,
          padding: '38px 32px',
          boxShadow: '0 24px 80px rgba(4, 120, 87, 0.10)',
          border: '1px solid #d1fae5',
        }}
      >
        <div style={{ fontSize: 44, marginBottom: 8, textAlign: 'center' }}>🌸</div>
        <div style={{ fontWeight: 800, color: '#047857', fontSize: 18, textAlign: 'center', marginBottom: 4 }}>
          成为植物收藏家
        </div>
        <div style={{ color: '#6b7280', fontSize: 12, textAlign: 'center', marginBottom: 22 }}>
          注册后自动加入「植物收藏家」标签体系
        </div>

        {err && (
          <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12 }}>
            {err === 'exists' ? '该邮箱已注册，请直接登录' :
             err === 'weak_password' ? '密码强度不够（至少 8 位，含字母数字）' :
             err === 'missing' ? '请填写所有字段' :
             `注册失败：${err}`}
          </div>
        )}
        {ok && (
          <div style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12 }}>
            🎉 注册成功！请前往登录。
          </div>
        )}

        <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>邮箱</label>
        <input name="email" type="email" required autoComplete="email"
          style={{ width: '100%', padding: '11px 13px', border: '1px solid #d1d5db', borderRadius: 10, marginTop: 4, marginBottom: 12, fontSize: 14 }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>姓</label>
            <input name="firstName" required
              style={{ width: '100%', padding: '11px 13px', border: '1px solid #d1d5db', borderRadius: 10, marginTop: 4, marginBottom: 12, fontSize: 14 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>名</label>
            <input name="lastName" required
              style={{ width: '100%', padding: '11px 13px', border: '1px solid #d1d5db', borderRadius: 10, marginTop: 4, marginBottom: 12, fontSize: 14 }} />
          </div>
        </div>

        <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>密码</label>
        <input name="password" type="password" required minLength={8} autoComplete="new-password"
          style={{ width: '100%', padding: '11px 13px', border: '1px solid #d1d5db', borderRadius: 10, marginTop: 4, marginBottom: 4, fontSize: 14 }} />
        <div style={{ color: '#9ca3af', fontSize: 11, marginBottom: 18 }}>至少 8 位，含字母和数字</div>

        <input type="hidden" name="redirect" value={redirect} />

        <button type="submit"
          style={{
            width: '100%', padding: '13px', borderRadius: 14,
            background: 'linear-gradient(135deg, #047857, #10b981)',
            color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)',
          }}
        >
          🌱 注册收藏家账号
        </button>

        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 12, color: '#6b7280' }}>
          已有账号？<a href={`/login?redirect=${encodeURIComponent(redirect)}`} style={{ color: '#047857', textDecoration: 'underline' }}>直接登录</a>
        </div>
      </form>
    </div>
  );
}
