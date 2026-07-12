// /login — 纯 HTML form 直接 POST 到后端 password-login-form
// 后端 zitadel v2 session -> Redis -> sid HttpOnly cookie
// 国内 (club) / 国际 (space/la) 由后端按 host 自动选 zitadel instance/client
export const dynamic = 'force-dynamic';

type SP = { redirect?: string; error?: string; callbackUrl?: string };

export default async function LoginPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = (await searchParams) || {};
  const redirect = sp.redirect || sp.callbackUrl || '/';
  const err = sp.error || '';
  const errMsg =
    err === 'invalid_credentials' ? '用户名或密码错误' :
    err === 'missing_credentials' ? '请填写用户名和密码' :
    err ? `登录失败: ${err}` : '';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 40%, #f0fdf4 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <form
        method="POST"
        action="/api/session/password-login-form"
        style={{
          width: '100%', maxWidth: 380, background: '#ffffff', borderRadius: 20,
          padding: '36px 30px',
          boxShadow: '0 10px 40px rgba(4, 120, 87, 0.08)',
          border: '1px solid #d1fae5',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 10, textAlign: 'center' }}>🌿</div>
        <div style={{ fontWeight: 800, color: '#047857', fontSize: 17, textAlign: 'center', marginBottom: 6 }}>
          植物收藏家 · 林草二十年
        </div>
        <div style={{ color: '#6b7280', fontSize: 12, textAlign: 'center', marginBottom: 20 }}>
          请输入账号密码登录
        </div>

        {errMsg && (
          <div style={{
            background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca',
            borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12,
          }}>{errMsg}</div>
        )}

        <label style={{ fontSize: 12, color: '#374151' }}>用户名 / 邮箱 / 手机号</label>
        <input
          name="loginName" autoComplete="username" required
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, marginTop: 4, marginBottom: 12, fontSize: 14 }}
        />

        <label style={{ fontSize: 12, color: '#374151' }}>密码</label>
        <input
          name="password" type="password" autoComplete="current-password" required
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, marginTop: 4, marginBottom: 16, fontSize: 14 }}
        />

        <input type="hidden" name="redirect" value={redirect} />

        <button
          type="submit"
          style={{
            width: '100%', padding: '12px', borderRadius: 12,
            background: 'linear-gradient(135deg, #047857, #059669)',
            color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          登录
        </button>

        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 12, color: '#6b7280' }}>
          <a href="/register" style={{ color: '#047857', textDecoration: 'underline' }}>注册新账号</a>
        </div>
      </form>
    </div>
  );
}
