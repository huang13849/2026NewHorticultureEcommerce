"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Strings = {
  registerTitle: string; registerSubtitle: string;
  labelPhone: string; labelEmail: string; labelFirstName: string; labelLastName: string;
  labelPassword: string; labelPwdConfirm: string;
  phonePlaceholder: string; emailPlaceholder: string;
  pwdHint: string; optional: string;
  register: string; login: string; hasAccount: string;
  submitting: string; goLogin: string; registerOk: string;
  errPwdMismatch: string; errExists: string; errWeakPwd: string;
  errMissing: string; errInvalidPhone: string; errGeneric: string;
};

export default function RegisterForm({ s, isRTL, redirect, lang, brand }: {
  s: Strings; isRTL: boolean; redirect: string; lang: string; brand: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 13px', border: '1px solid #d1d5db',
    borderRadius: 10, marginTop: 4, marginBottom: 12, fontSize: 14,
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, color: '#374151', fontWeight: 600 };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError('');
    const fd = new FormData(e.currentTarget);
    const pwd = String(fd.get('password') || '');
    const pwd2 = String(fd.get('passwordConfirm') || '');
    if (pwd !== pwd2) { setError(s.errPwdMismatch); return; }
    setSubmitting(true);
    try {
      const payload = {
        phone: String(fd.get('phone') || '').trim(),
        email: String(fd.get('email') || '').trim(),
        password: pwd,
        firstName: String(fd.get('firstName') || '').trim(),
        lastName: String(fd.get('lastName') || '').trim(),
        redirect, lang, brand,
      };
      const res = await fetch('/api/auth/register-collector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || data.error) {
        const err = data.error || `zitadel_${res.status}`;
        const msg =
          err === 'exists' ? s.errExists :
          err === 'weak_password' ? s.errWeakPwd :
          err === 'missing' ? s.errMissing :
          err === 'invalid_phone' ? s.errInvalidPhone :
          `${s.errGeneric}: ${err}`;
        setError(msg);
        setSubmitting(false);
        return;
      }
      setOk(true);
      setTimeout(() => {
        router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
      }, 1200);
    } catch (e: any) {
      setError(`${s.errGeneric}: ${e?.message || 'network'}`);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        width: '100%', maxWidth: 440, background: '#ffffff', borderRadius: 24,
        padding: '38px 32px',
        boxShadow: '0 24px 80px rgba(4, 120, 87, 0.10)',
        border: '1px solid #d1fae5',
      }}>
      <div style={{ fontSize: 44, marginBottom: 8, textAlign: 'center' }}>🌸</div>
      <div style={{ fontWeight: 800, color: '#047857', fontSize: 18, textAlign: 'center', marginBottom: 4 }}>
        {s.registerTitle}
      </div>
      <div style={{ color: '#6b7280', fontSize: 12, textAlign: 'center', marginBottom: 22 }}>
        {s.registerSubtitle}
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {ok && (
        <div style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12 }}>
          🎉 {s.registerOk} {s.goLogin}…
        </div>
      )}

      <label style={labelStyle}>
        {s.labelPhone} <span style={{ color: '#dc2626' }}>*</span>
      </label>
      <input name="phone" type="tel" required autoComplete="tel" inputMode="tel"
        placeholder={s.phonePlaceholder} pattern="^[+0-9\-\s()]{7,20}$"
        disabled={submitting || ok} style={inputStyle} />

      <label style={labelStyle}>
        {s.labelEmail} <span style={{ color: '#9ca3af', fontSize: 11 }}>({s.optional})</span>
      </label>
      <input name="email" type="email" autoComplete="email"
        placeholder={s.emailPlaceholder}
        disabled={submitting || ok} style={inputStyle} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>{s.labelFirstName}</label>
          <input name="firstName" required disabled={submitting || ok} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{s.labelLastName}</label>
          <input name="lastName" required disabled={submitting || ok} style={inputStyle} />
        </div>
      </div>

      <label style={labelStyle}>{s.labelPassword}</label>
      <input name="password" type="password" required minLength={8} autoComplete="new-password"
        disabled={submitting || ok}
        style={{ ...inputStyle, marginBottom: 4 }} />
      <div style={{ color: '#9ca3af', fontSize: 11, marginBottom: 12 }}>{s.pwdHint}</div>

      <label style={labelStyle}>{s.labelPwdConfirm}</label>
      <input name="passwordConfirm" type="password" required minLength={8} autoComplete="new-password"
        disabled={submitting || ok} style={{ ...inputStyle, marginBottom: 18 }} />

      <button type="submit" disabled={submitting || ok}
        style={{
          width: '100%', padding: '13px', borderRadius: 14,
          background: (submitting || ok) ? '#9ca3af' : 'linear-gradient(135deg, #047857, #10b981)',
          color: '#fff', border: 'none', fontSize: 15, fontWeight: 700,
          cursor: (submitting || ok) ? 'not-allowed' : 'pointer',
          opacity: (submitting || ok) ? 0.75 : 1,
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)',
        }}>
        {submitting ? s.submitting : ok ? s.goLogin : s.register}
      </button>

      <div style={{ marginTop: 14, textAlign: 'center', fontSize: 12, color: '#6b7280' }}>
        {s.hasAccount}{' '}
        <a href={`/login?redirect=${encodeURIComponent(redirect)}`}
          style={{ color: '#047857', textDecoration: 'underline', fontWeight: 600 }}>
          {s.login}
        </a>
      </div>
    </form>
  );
}
