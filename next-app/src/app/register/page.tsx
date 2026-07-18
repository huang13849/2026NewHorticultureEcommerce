// /register — 手机号(主) + 邮箱(可选) + 密码, i18n 化, 落到 Shop Club instance
// 成功后自动打「植物收藏家」标签
import { pickServerLang, serverT } from '@/lib/i18n/server-lang';
import RegisterForm from './RegisterForm';
export const dynamic = 'force-dynamic';

type SP = { redirect?: string; brand?: string };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = (await searchParams) || {};
  const redirect = sp.redirect || '/';
  const brand = sp.brand || 'club';
  const lang = await pickServerLang();
  const t = serverT(lang);
  const isRTL = lang === 'ar';

  // Pre-compute all strings — server->client passes plain data only (no functions)
  const s = {
    registerTitle: t('auth.registerTitle'),
    registerSubtitle: t('auth.registerSubtitle'),
    labelPhone: t('auth.labelPhone'),
    labelEmail: t('auth.labelEmail'),
    labelFirstName: t('auth.labelFirstName'),
    labelLastName: t('auth.labelLastName'),
    labelPassword: t('auth.labelPassword'),
    labelPwdConfirm: t('auth.labelPwdConfirm'),
    phonePlaceholder: t('auth.phonePlaceholder'),
    emailPlaceholder: t('auth.emailPlaceholder'),
    pwdHint: t('auth.pwdHint'),
    optional: t('auth.optional'),
    register: t('common.register'),
    login: t('common.login'),
    hasAccount: t('auth.hasAccount'),
    submitting: t('auth.submitting'),
    goLogin: t('auth.goLogin'),
    registerOk: t('auth.registerOk'),
    errPwdMismatch: t('auth.errPwdMismatch'),
    errExists: t('auth.errExists'),
    errWeakPwd: t('auth.errWeakPwd'),
    errMissing: t('auth.errMissing'),
    errInvalidPhone: t('auth.errInvalidPhone'),
    errGeneric: t('auth.errGeneric'),
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 15% 10%, #fee2e2 0%, transparent 25%), radial-gradient(circle at 85% 15%, #dcfce7 0%, transparent 28%), linear-gradient(135deg, #fff7ed 0%, #f0fdf4 55%, #fef2f2 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <RegisterForm s={s} isRTL={isRTL} redirect={redirect} lang={lang} brand={brand} />
    </div>
  );
}
