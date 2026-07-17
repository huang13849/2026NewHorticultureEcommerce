// /login — 手机号(主) / 邮箱(备) 双 tab 登录, i18n 化, 与首页语言一致
// 后端 zitadel v2 session -> Redis -> sid HttpOnly cookie
// 国内 (club) / 国际 (space/la) 由后端按 host 自动选 zitadel instance/client
import { pickServerLang, serverT } from '@/lib/i18n/server-lang';
export const dynamic = 'force-dynamic';

type SP = { redirect?: string; error?: string; callbackUrl?: string; mode?: 'phone' | 'email' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = (await searchParams) || {};
  const redirect = sp.redirect || sp.callbackUrl || '/';
  const err = sp.error || '';
  const mode: 'phone' | 'email' = sp.mode === 'email' ? 'email' : 'phone';
  const lang = await pickServerLang();
  const t = serverT(lang);
  const isRTL = lang === 'ar';

  const errMsg =
    err === 'invalid_credentials' ? t('auth.errInvalidCreds') :
    err === 'missing_credentials' ? t('auth.errMissing') :
    err ? `${t('auth.errGeneric')}: ${err}` : '';

  const phoneActive = mode === 'phone';

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 40%, #f0fdf4 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <form
        method="POST"
        action="/api/session/password-login-form"
        style={{
          width: '100%', maxWidth: 400, background: '#ffffff', borderRadius: 20,
          padding: '36px 30px',
          boxShadow: '0 10px 40px rgba(4, 120, 87, 0.08)',
          border: '1px solid #d1fae5',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 10, textAlign: 'center' }}>🌿</div>
        <div style={{ fontWeight: 800, color: '#047857', fontSize: 17, textAlign: 'center', marginBottom: 6 }}>
          {t('auth.brandTitle')}
        </div>
        <div style={{ color: '#6b7280', fontSize: 12, textAlign: 'center', marginBottom: 18 }}>
          {t('auth.loginSubtitle')}
        </div>

        {/* Tab: 手机号 / 邮箱 */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
          background: '#f3f4f6', padding: 4, borderRadius: 12, marginBottom: 16,
        }}>
          <a
            href={`/login?mode=phone&redirect=${encodeURIComponent(redirect)}`}
            style={{
              textAlign: 'center', padding: '8px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              textDecoration: 'none',
              background: phoneActive ? '#ffffff' : 'transparent',
              color: phoneActive ? '#047857' : '#6b7280',
              boxShadow: phoneActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >📱 {t('auth.tabPhone')}</a>
          <a
            href={`/login?mode=email&redirect=${encodeURIComponent(redirect)}`}
            style={{
              textAlign: 'center', padding: '8px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              textDecoration: 'none',
              background: !phoneActive ? '#ffffff' : 'transparent',
              color: !phoneActive ? '#047857' : '#6b7280',
              boxShadow: !phoneActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >✉️ {t('auth.tabEmail')}</a>
        </div>

        {errMsg && (
          <div style={{
            background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca',
            borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12,
          }}>{errMsg}</div>
        )}

        <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>
          {phoneActive ? t('auth.labelPhone') : t('auth.labelEmail')}
        </label>
        <input
          key={mode}
          name="loginName"
          type={phoneActive ? 'tel' : 'email'}
          autoComplete={phoneActive ? 'tel' : 'email'}
          inputMode={phoneActive ? 'tel' : 'email'}
          placeholder={phoneActive ? t('auth.phonePlaceholder') : t('auth.emailPlaceholder')}
          required
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, marginTop: 4, marginBottom: 12, fontSize: 14 }}
        />

        <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{t('auth.labelPassword')}</label>
        <input
          name="password" type="password" autoComplete="current-password" required
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, marginTop: 4, marginBottom: 16, fontSize: 14 }}
        />

        <input type="hidden" name="redirect" value={redirect} />
        <input type="hidden" name="loginMode" value={mode} />

        <button
          type="submit"
          style={{
            width: '100%', padding: '12px', borderRadius: 12,
            background: 'linear-gradient(135deg, #047857, #059669)',
            color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {t('common.login')}
        </button>

        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 12, color: '#6b7280' }}>
          {t('auth.noAccount')} <a href={`/register?redirect=${encodeURIComponent(redirect)}`} style={{ color: '#047857', textDecoration: 'underline', fontWeight: 600 }}>{t('common.register')}</a>
        </div>
      </form>
    </div>
  );
}
