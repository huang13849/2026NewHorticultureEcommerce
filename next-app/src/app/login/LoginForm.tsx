"use client";
import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Strings = {
  brandTitle: string; loginSubtitle: string;
  tabPhone: string; tabEmail: string;
  labelPhone: string; labelEmail: string; labelPassword: string;
  phonePlaceholder: string; emailPlaceholder: string;
  login: string; loginSubmitting: string;
  noAccount: string; register: string;
  errInvalidCreds: string; errMissing: string; errGeneric: string;
  pwdOnlyRetry: string;
};

export default function LoginForm({ s, isRTL, redirect, initialError, initialMode }: {
  s: Strings; isRTL: boolean; redirect: string;
  initialError: string; initialMode: 'phone' | 'email';
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [mode, setMode] = useState<'phone' | 'email'>(initialMode);
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pwdOnly, setPwdOnly] = useState(false);
  const pwdRef = useRef<HTMLInputElement>(null);

  // Server-side redirect brought us here with ?error=xxx
  useEffect(() => {
    if (initialError === 'invalid_credentials') {
      setError(s.pwdOnlyRetry);
      setPwdOnly(true);
      setPassword('');
      setTimeout(() => pwdRef.current?.focus(), 60);
    } else if (initialError === 'missing_credentials') {
      setError(s.errMissing);
    } else if (initialError) {
      setError(`${s.errGeneric}: ${initialError}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialError]);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
    borderRadius: 8, marginTop: 4, marginBottom: 12, fontSize: 14,
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, color: '#374151', fontWeight: 600 };
  const phoneActive = mode === 'phone';

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError('');
    if (!loginName.trim() || !password) {
      setError(s.errMissing);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/session/password-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ loginName: loginName.trim(), password }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || data.error) {
        const err = data.error || `http_${res.status}`;
        if (err === 'invalid_credentials') {
          setError(s.pwdOnlyRetry);
          setPwdOnly(true);
          setPassword('');
          setTimeout(() => pwdRef.current?.focus(), 60);
        } else if (err === 'missing_credentials') {
          setError(s.errMissing);
        } else {
          setError(`${s.errGeneric}: ${err}`);
        }
        setSubmitting(false);
        return;
      }
      // ok → go
      router.push(redirect || '/');
    } catch (e: any) {
      setError(`${s.errGeneric}: ${e?.message || 'network'}`);
      setSubmitting(false);
    }
  }

  function switchMode(m: 'phone' | 'email') {
    if (pwdOnly) return; // 密码错误锁定阶段禁切
    setMode(m);
    setLoginName('');
    setPassword('');
    setError('');
    setPwdOnly(false);
  }

  return (
    <form onSubmit={onSubmit} dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        width: '100%', maxWidth: 400, background: '#ffffff', borderRadius: 20,
        padding: '36px 30px',
        boxShadow: '0 10px 40px rgba(4, 120, 87, 0.08)',
        border: '1px solid #d1fae5',
      }}>
      <div style={{ fontSize: 48, marginBottom: 10, textAlign: 'center' }}>🌿</div>
      <div style={{ fontWeight: 800, color: '#047857', fontSize: 17, textAlign: 'center', marginBottom: 6 }}>
        {s.brandTitle}
      </div>
      <div style={{ color: '#6b7280', fontSize: 12, textAlign: 'center', marginBottom: 18 }}>
        {s.loginSubtitle}
      </div>

      {/* Tab: 手机号 / 邮箱 */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
        background: '#f3f4f6', padding: 4, borderRadius: 12, marginBottom: 16,
        opacity: pwdOnly ? 0.5 : 1,
      }}>
        <button type="button" onClick={() => switchMode('phone')} disabled={pwdOnly}
          style={{
            textAlign: 'center', padding: '8px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700,
            border: 'none', cursor: pwdOnly ? 'not-allowed' : 'pointer',
            background: phoneActive ? '#ffffff' : 'transparent',
            color: phoneActive ? '#047857' : '#6b7280',
            boxShadow: phoneActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
          }}>📱 {s.tabPhone}</button>
        <button type="button" onClick={() => switchMode('email')} disabled={pwdOnly}
          style={{
            textAlign: 'center', padding: '8px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700,
            border: 'none', cursor: pwdOnly ? 'not-allowed' : 'pointer',
            background: !phoneActive ? '#ffffff' : 'transparent',
            color: !phoneActive ? '#047857' : '#6b7280',
            boxShadow: !phoneActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
          }}>✉️ {s.tabEmail}</button>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca',
          borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12,
        }}>{error}</div>
      )}

      <label style={labelStyle}>
        {phoneActive ? s.labelPhone : s.labelEmail}
      </label>
      <input
        name="loginName"
        value={loginName}
        onChange={e => setLoginName(e.target.value)}
        type={phoneActive ? 'tel' : 'email'}
        autoComplete={phoneActive ? 'tel' : 'email'}
        inputMode={phoneActive ? 'tel' : 'email'}
        placeholder={phoneActive ? s.phonePlaceholder : s.emailPlaceholder}
        required
        readOnly={pwdOnly}
        disabled={submitting}
        style={{
          ...inputStyle,
          background: pwdOnly ? '#f9fafb' : '#ffffff',
          color: pwdOnly ? '#6b7280' : '#111827',
        }}
      />

      <label style={labelStyle}>{s.labelPassword}</label>
      <input
        ref={pwdRef}
        name="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        type="password"
        autoComplete="current-password"
        required
        disabled={submitting}
        style={{ ...inputStyle, marginBottom: 16 }}
      />

      <button
        type="submit"
        disabled={submitting}
        style={{
          width: '100%', padding: '12px', borderRadius: 12,
          background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #047857, #059669)',
          color: '#fff', border: 'none', fontSize: 14, fontWeight: 700,
          cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.75 : 1,
        }}
      >
        {submitting ? s.loginSubmitting : s.login}
      </button>

      <div style={{ marginTop: 14, textAlign: 'center', fontSize: 12, color: '#6b7280' }}>
        {s.noAccount}{' '}
        <a href={`/register?redirect=${encodeURIComponent(redirect)}`}
          style={{ color: '#047857', textDecoration: 'underline', fontWeight: 600 }}>
          {s.register}
        </a>
      </div>
    </form>
  );
}
