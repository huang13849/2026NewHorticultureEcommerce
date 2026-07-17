// /register — 手机号(主) + 邮箱(可选) + 密码, i18n 化, 落到 Shop Club instance
// 成功后自动打「植物收藏家」标签
import { pickServerLang, serverT } from '@/lib/i18n/server-lang';
export const dynamic = 'force-dynamic';

type SP = { redirect?: string; error?: string; ok?: string };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = (await searchParams) || {};
  const redirect = sp.redirect || '/';
  const err = sp.error || '';
  const ok = sp.ok || '';
  const lang = await pickServerLang();
  const t = serverT(lang);
  const isRTL = lang === 'ar';

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 15% 10%, #fee2e2 0%, transparent 25%), radial-gradient(circle at 85% 15%, #dcfce7 0%, transparent 28%), linear-gradient(135deg, #fff7ed 0%, #f0fdf4 55%, #fef2f2 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <form
        method="POST"
        action="/api/auth/register-collector"
        style={{
          width: '100%', maxWidth: 440, background: '#ffffff', borderRadius: 24,
          padding: '38px 32px',
          boxShadow: '0 24px 80px rgba(4, 120, 87, 0.10)',
          border: '1px solid #d1fae5',
        }}
      >
        <div style={{ fontSize: 44, marginBottom: 8, textAlign: 'center' }}>🌸</div>
        <div style={{ fontWeight: 800, color: '#047857', fontSize: 18, textAlign: 'center', marginBottom: 4 }}>
          {t('auth.registerTitle')}
        </div>
        <div style={{ color: '#6b7280', fontSize: 12, textAlign: 'center', marginBottom: 22 }}>
          {t('auth.registerSubtitle')}
        </div>

        {err && (
          <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12 }}>
            {err === 'exists' ? t('auth.errExists') :
             err === 'weak_password' ? t('auth.errWeakPwd') :
             err === 'missing' ? t('auth.errMissing') :
             err === 'invalid_phone' ? t('auth.errInvalidPhone') :
             `${t('auth.errGeneric')}: ${err}`}
          </div>
        )}
        {ok && (
          <div style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12 }}>
            🎉 {t('auth.registerOk')}
          </div>
        )}

        <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>
          {t('auth.labelPhone')} <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <input name="phone" type="tel" required autoComplete="tel" inputMode="tel"
          placeholder={t('auth.phonePlaceholder')}
          pattern="^[+0-9\-\s()]{7,20}$"
          style={{ width: '100%', padding: '11px 13px', border: '1px solid #d1d5db', borderRadius: 10, marginTop: 4, marginBottom: 12, fontSize: 14 }} />

        <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>
          {t('auth.labelEmail')} <span style={{ color: '#9ca3af', fontSize: 11 }}>({t('auth.optional')})</span>
        </label>
        <input name="email" type="email" autoComplete="email"
          placeholder={t('auth.emailPlaceholder')}
          style={{ width: '100%', padding: '11px 13px', border: '1px solid #d1d5db', borderRadius: 10, marginTop: 4, marginBottom: 12, fontSize: 14 }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{t('auth.labelFirstName')}</label>
            <input name="firstName" required
              style={{ width: '100%', padding: '11px 13px', border: '1px solid #d1d5db', borderRadius: 10, marginTop: 4, marginBottom: 12, fontSize: 14 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{t('auth.labelLastName')}</label>
            <input name="lastName" required
              style={{ width: '100%', padding: '11px 13px', border: '1px solid #d1d5db', borderRadius: 10, marginTop: 4, marginBottom: 12, fontSize: 14 }} />
          </div>
        </div>

        <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{t('auth.labelPassword')}</label>
        <input name="password" type="password" required minLength={8} autoComplete="new-password"
          style={{ width: '100%', padding: '11px 13px', border: '1px solid #d1d5db', borderRadius: 10, marginTop: 4, marginBottom: 4, fontSize: 14 }} />
        <div style={{ color: '#9ca3af', fontSize: 11, marginBottom: 18 }}>{t('auth.pwdHint')}</div>

        <input type="hidden" name="redirect" value={redirect} />
        <input type="hidden" name="lang" value={lang} />

        <button type="submit"
          style={{
            width: '100%', padding: '13px', borderRadius: 14,
            background: 'linear-gradient(135deg, #047857, #10b981)',
            color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)',
          }}
        >
          {t('common.register')}
        </button>

        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 12, color: '#6b7280' }}>
          {t('auth.hasAccount')} <a href={`/login?redirect=${encodeURIComponent(redirect)}`} style={{ color: '#047857', textDecoration: 'underline', fontWeight: 600 }}>{t('common.login')}</a>
        </div>
      </form>
    </div>
  );
}
