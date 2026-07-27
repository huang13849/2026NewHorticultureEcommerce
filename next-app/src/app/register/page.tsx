'use client';

import { useState, useRef } from 'react';

type Lang = 'zh' | 'en' | 'ja' | 'ar';

const T = {
  zh: {
    title: '注册植物收藏家', subtitle: '加入花园俱乐部，开启植物之旅',
    phone: '手机号', email: '邮箱', emailOpt: '邮箱（选填）', optional: '选填',
    firstName: '名', lastName: '姓', password: '密码', pwdHint: '至少8位，需含字母和数字',
    register: '注 册', hasAccount: '已有账号？', login: '去登录',
    errExists: '该手机号或邮箱已注册', errWeakPwd: '密码强度不足（至少8位含字母和数字）',
    errMissing: '请填写必填字段', errInvalidPhone: '手机号格式不正确', errGeneric: '注册失败',
    errNetwork: '网络错误，请稍后重试', errService: '服务暂时不可用，请稍后重试',
    registering: '注册中…', registerOk: '🎉 注册成功！正在跳转到登录页…',
    phonePlaceholder: '请输入手机号', emailPlaceholder: '请输入邮箱',
  },
  en: {
    title: 'Register as Plant Collector', subtitle: 'Join Garden Club, start your plant journey',
    phone: 'Phone', email: 'Email', emailOpt: 'Email (optional)', optional: 'optional',
    firstName: 'First Name', lastName: 'Last Name', password: 'Password', pwdHint: 'Min 8 chars with letters and numbers',
    register: 'Register', hasAccount: 'Already have an account?', login: 'Login',
    errExists: 'This phone or email is already registered', errWeakPwd: 'Weak password (min 8 chars with letters and numbers)',
    errMissing: 'Please fill in required fields', errInvalidPhone: 'Invalid phone number', errGeneric: 'Registration failed',
    errNetwork: 'Network error, please try again later', errService: 'Service unavailable, please try again later',
    registering: 'Registering…', registerOk: '🎉 Registration successful! Redirecting to login…',
    phonePlaceholder: 'Enter phone number', emailPlaceholder: 'Enter email',
  },
  ja: {
    title: '植物コレクター登録', subtitle: 'ガーデンクラブに参加して植物の旅を始めましょう',
    phone: '電話番号', email: 'メール', emailOpt: 'メール（任意）', optional: '任意',
    firstName: '名', lastName: '姓', password: 'パスワード', pwdHint: '8文字以上、英字と数字を含めてください',
    register: '登 録', hasAccount: 'アカウントをお持ちですか？', login: 'ログイン',
    errExists: 'この電話番号またはメールは既に登録されています', errWeakPwd: 'パスワードが弱すぎます（8文字以上、英字と数字）',
    errMissing: '必須項目を入力してください', errInvalidPhone: '電話番号の形式が正しくありません', errGeneric: '登録に失敗しました',
    errNetwork: 'ネットワークエラー、後でもう一度お試しください', errService: 'サービス一時利用不可、後でもう一度お試しください',
    registering: '登録中…', registerOk: '🎉 登録成功！ログインページへ移動中…',
    phonePlaceholder: '電話番号を入力', emailPlaceholder: 'メールを入力',
  },
  ar: {
    title: 'سجل كجامع نباتات', subtitle: 'انضم إلى نادي الحديقة وابدأ رحلتك النباتية',
    phone: 'هاتف', email: 'بريد إلكتروني', emailOpt: 'بريد إلكتروني (اختياري)', optional: 'اختياري',
    firstName: 'الاسم الأول', lastName: 'اسم العائلة', password: 'كلمة المرور', pwdHint: '8 أحرف على الأقل مع أحرف وأرقام',
    register: 'تسجيل', hasAccount: 'لديك حساب بالفعل؟', login: 'تسجيل الدخول',
    errExists: 'هذا الهاتف أو البريد الإلكتروني مسجل بالفعل', errWeakPwd: 'كلمة مرور ضعيفة (8 أحرف على الأقل مع أحرف وأرقام)',
    errMissing: 'يرجى ملء الحقول المطلوبة', errInvalidPhone: 'رقم الهاتف غير صالح', errGeneric: 'فشل التسجيل',
    errNetwork: 'خطأ في الشبكة، حاول لاحقاً', errService: 'الخدمة غير متاحة، حاول لاحقاً',
    registering: 'جارٍ التسجيل…', registerOk: '🎉 تم التسجيل بنجاح! جارٍ التحويل إلى تسجيل الدخول…',
    phonePlaceholder: 'أدخل رقم الهاتف', emailPlaceholder: 'أدخل البريد الإلكتروني',
  },
};

function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'zh';
  const l = navigator.language.toLowerCase();
  if (l.startsWith('ja')) return 'ja';
  if (l.startsWith('ar')) return 'ar';
  if (l.startsWith('en')) return 'en';
  return 'zh';
}

export default function RegisterPage() {
  const redirect = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') || '/' : '/';

  const [lang] = useState<Lang>(detectLang());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const t = T[lang];
  const isRTL = lang === 'ar';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError('');
    setSuccess('');

    const form = e.currentTarget;
    const fd = new FormData(form);
    const phone = String(fd.get('phone') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');
    const firstName = String(fd.get('firstName') || '').trim();
    const lastName = String(fd.get('lastName') || '').trim();
    const redirectVal = String(fd.get('redirect') || '/');

    if (!password || !firstName || !lastName) { setError(t.errMissing); return; }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) { setError(t.errWeakPwd); return; }

    const normPhone = phone.replace(/[\s\-()]/g, '');
    const hasPhone = /^\+?[0-9]{7,15}$/.test(normPhone);
    const canonicalPhone = hasPhone
      ? (normPhone.startsWith('+') ? normPhone
        : /^1[3-9]\d{9}$/.test(normPhone) ? `+86${normPhone}`
        : `+${normPhone}`)
      : '';
    if (!canonicalPhone && !email) { setError(t.errMissing); return; }

    setLoading(true);
    try {
      const resp = await fetch('/api/auth/register-collector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: canonicalPhone, email, password, firstName, lastName,
          redirect: redirectVal, lang, brand: 'club',
        }),
      });

      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        if (data.ok) {
          setSuccess(t.registerOk);
          setTimeout(() => {
            window.location.href = `/login?register=ok&redirect=${encodeURIComponent(redirectVal)}`;
          }, 1500);
          return;
        }
      }

      // Try to parse error
      let errCode = '';
      try { const ej = await resp.json(); errCode = ej.error || ''; } catch {}
      if (/exists|already/i.test(errCode)) setError(t.errExists);
      else if (/weak_password/i.test(errCode)) setError(t.errWeakPwd);
      else if (/missing/i.test(errCode)) setError(t.errMissing);
      else if (/invalid_phone/i.test(errCode)) setError(t.errInvalidPhone);
      else if (/service_unavailable/i.test(errCode)) setError(t.errService);
      else if (/network/i.test(errCode)) setError(t.errNetwork);
      else setError(`${t.errGeneric}${errCode ? ': ' + errCode : ''}`);
    } catch (err: any) {
      setError(t.errNetwork);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 15% 10%, #fee2e2 0%, transparent 25%), radial-gradient(circle at 85% 15%, #dcfce7 0%, transparent 28%), linear-gradient(135deg, #fff7ed 0%, #f0fdf4 55%, #fef2f2 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        style={{
          width: '100%', maxWidth: 440, background: '#ffffff', borderRadius: 24,
          padding: '38px 32px',
          boxShadow: '0 24px 80px rgba(4, 120, 87, 0.10)',
          border: '1px solid #d1fae5',
        }}
      >
        <div style={{ fontSize: 44, marginBottom: 8, textAlign: 'center' }}>🌸</div>
        <div style={{ fontWeight: 800, color: '#047857', fontSize: 18, textAlign: 'center', marginBottom: 4 }}>
          {t.title}
        </div>
        <div style={{ color: '#6b7280', fontSize: 12, textAlign: 'center', marginBottom: 22 }}>
          {t.subtitle}
        </div>

        {error && (
          <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12 }}>
            {success}
          </div>
        )}

        <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>
          {t.phone} <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <input name="phone" type="tel" required autoComplete="tel" inputMode="tel"
          disabled={loading}
          placeholder={t.phonePlaceholder}
          pattern="^[+0-9\-\s()]{7,20}$"
          style={{ width: '100%', padding: '11px 13px', border: '1px solid #d1d5db', borderRadius: 10, marginTop: 4, marginBottom: 12, fontSize: 14, opacity: loading ? 0.6 : 1 }} />

        <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>
          {t.emailOpt} <span style={{ color: '#9ca3af', fontSize: 11 }}>({t.optional})</span>
        </label>
        <input name="email" type="email" autoComplete="email"
          disabled={loading}
          placeholder={t.emailPlaceholder}
          style={{ width: '100%', padding: '11px 13px', border: '1px solid #d1d5db', borderRadius: 10, marginTop: 4, marginBottom: 12, fontSize: 14, opacity: loading ? 0.6 : 1 }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{t.firstName} *</label>
            <input name="firstName" required disabled={loading}
              style={{ width: '100%', padding: '11px 13px', border: '1px solid #d1d5db', borderRadius: 10, marginTop: 4, marginBottom: 12, fontSize: 14, opacity: loading ? 0.6 : 1 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{t.lastName} *</label>
            <input name="lastName" required disabled={loading}
              style={{ width: '100%', padding: '11px 13px', border: '1px solid #d1d5db', borderRadius: 10, marginTop: 4, marginBottom: 12, fontSize: 14, opacity: loading ? 0.6 : 1 }} />
          </div>
        </div>

        <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{t.password}</label>
        <input name="password" type="password" required minLength={8} autoComplete="new-password" disabled={loading}
          style={{ width: '100%', padding: '11px 13px', border: '1px solid #d1d5db', borderRadius: 10, marginTop: 4, marginBottom: 4, fontSize: 14, opacity: loading ? 0.6 : 1 }} />
        <div style={{ color: '#9ca3af', fontSize: 11, marginBottom: 18 }}>{t.pwdHint}</div>

        <input type="hidden" name="redirect" value={redirect} />
        <input type="hidden" name="lang" value={lang} />

        <button type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '13px', borderRadius: 14,
            background: loading ? '#9ca3af' : 'linear-gradient(135deg, #047857, #10b981)',
            color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 8px 24px rgba(16, 185, 129, 0.25)',
            transition: 'all 0.2s',
          }}
        >
          {loading ? t.registering : t.register}
        </button>

        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 12, color: '#6b7280' }}>
          {t.hasAccount} <a href={`/login?redirect=${encodeURIComponent(redirect)}`} style={{ color: '#047857', textDecoration: 'underline', fontWeight: 600 }}>{t.login}</a>
        </div>
      </form>
    </div>
  );
}
