// src/middleware.ts
// 国际版 (horiculture.space): /login 直接 302 到 /login/sso 中间页,
// 该页面服务端渲染一个自动提交的 <form action="/api/auth/signin/zitadel">
// 目标: 用户在国际版看到"登录"链接后, 不会看到本地手机号表单。
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').toLowerCase();
  const isIntl = /horiculture\.space/.test(host);
  if (isIntl && req.nextUrl.pathname === '/login') {
    const url = req.nextUrl.clone();
    url.pathname = '/login/sso';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/login'],
};
