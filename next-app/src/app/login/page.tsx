// /login — 手机号/邮箱双 tab, i18n, 密码错只重置密码
import { pickServerLang, serverT } from '@/lib/i18n/server-lang';
import LoginForm from './LoginForm';
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

  const s = {
    brandTitle: t('auth.brandTitle'),
    loginSubtitle: t('auth.loginSubtitle'),
    tabPhone: t('auth.tabPhone'),
    tabEmail: t('auth.tabEmail'),
    labelPhone: t('auth.labelPhone'),
    labelEmail: t('auth.labelEmail'),
    labelPassword: t('auth.labelPassword'),
    phonePlaceholder: t('auth.phonePlaceholder'),
    emailPlaceholder: t('auth.emailPlaceholder'),
    login: t('common.login'),
    loginSubmitting: t('auth.loginSubmitting'),
    noAccount: t('auth.noAccount'),
    register: t('common.register'),
    errInvalidCreds: t('auth.errInvalidCreds'),
    errMissing: t('auth.errMissing'),
    errGeneric: t('auth.errGeneric'),
    pwdOnlyRetry: t('auth.pwdOnlyRetry'),
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 40%, #f0fdf4 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <LoginForm s={s} isRTL={isRTL} redirect={redirect} initialError={err} initialMode={mode} />
    </div>
  );
}
