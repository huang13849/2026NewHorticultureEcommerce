// src/app/login/sso/page.tsx
// SSR 渲染一个自动提交表单, 直接 POST 到 /api/auth/signin/zitadel。
// CSRF token 从 Auth.js /api/auth/csrf endpoint 拉。
// 国际版 (horiculture.space) 通过 middleware 会被送到这里。
import { headers } from 'next/headers';

async function fetchCsrf(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || '';
  const proto = h.get('x-forwarded-proto') || 'http';
  const url = `${proto}://${host}/api/auth/csrf`;
  try {
    const r = await fetch(url, { cache: 'no-store' });
    const j = await r.json();
    return j.csrfToken as string;
  } catch {
    return '';
  }
}

export const dynamic = 'force-dynamic';

export default async function SsoRedirectPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const redirect = sp?.redirect || '/';
  const csrf = await fetchCsrf();

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui', background: '#fff', color: '#1c1c1c' }}>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56 }}>🔐</div>
            <h1 style={{ color: '#047857', margin: '12px 0 6px' }}>Redirecting to Sign in</h1>
            <p style={{ color: '#78716c', fontSize: 14 }}>You will be authenticated via Zitadel SSO…</p>
            <noscript>
              <p style={{ color: '#d97706', marginTop: 16 }}>JavaScript is disabled. Please click the button below.</p>
            </noscript>
            <form id="ssoform" method="POST" action="/api/auth/signin/zitadel" style={{ marginTop: 20 }}>
              <input type="hidden" name="csrfToken" value={csrf} />
              <input type="hidden" name="callbackUrl" value={redirect} />
              <button type="submit" style={{ padding: '10px 22px', borderRadius: 8, background: '#047857', color: '#fff', border: 0, fontWeight: 600, cursor: 'pointer' }}>
                Continue to Zitadel Sign in
              </button>
            </form>
          </div>
        </main>
        <script
          dangerouslySetInnerHTML={{ __html: "setTimeout(function(){ var f=document.getElementById('ssoform'); if(f) f.submit(); }, 80);" }}
        />
      </body>
    </html>
  );
}
