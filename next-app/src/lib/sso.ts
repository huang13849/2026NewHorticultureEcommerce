// src/lib/sso.ts
// 国际版 (horiculture.space) 强制 Zitadel SSO 助手。
// 通过 Auth.js v5 的 POST /api/auth/signin/zitadel + CSRF token 触发 302 到 Zitadel。
// 纯客户端，不依赖 next-auth/react，也不需要 SessionProvider 包裹。

'use client';

export function isInternationalHost(): boolean {
  if (typeof window === 'undefined') return false;
  return /horiculture\.space/i.test(window.location.hostname);
}

/**
 * 触发 Zitadel SSO 登录流程，浏览器提交表单 → /api/auth/signin/zitadel
 * → 302 到 Zitadel authorize。
 */
export async function startSSO(callbackUrl?: string): Promise<void> {
  if (typeof window === 'undefined') return;

  const cb = callbackUrl || window.location.pathname + window.location.search;

  // 拿 CSRF token
  const r = await fetch('/api/auth/csrf', { credentials: 'include' });
  const { csrfToken } = await r.json();

  // POST 表单触发跳转
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '/api/auth/signin/zitadel';
  form.style.display = 'none';

  const csrf = document.createElement('input');
  csrf.type = 'hidden'; csrf.name = 'csrfToken'; csrf.value = csrfToken;
  form.appendChild(csrf);

  const cbi = document.createElement('input');
  cbi.type = 'hidden'; cbi.name = 'callbackUrl'; cbi.value = cb;
  form.appendChild(cbi);

  document.body.appendChild(form);
  form.submit();
}
