// /login — 纯 HTML 表单 POST 到 Auth.js /api/auth/signin/zitadel
// 完全不依赖客户端 hydration, 点击就是浏览器原生 form submit → 302 → Zitadel。
// 两个按钮: 登录 / 注册。注册通过额外 hidden authorizationParams.prompt=create。
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

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const redirect = sp?.redirect || '/';
  const csrf = await fetchCsrf();

  return (
    <main className="min-h-screen bg-white text-stone-900 flex flex-col items-center justify-center px-8">
      <p className="text-6xl mb-4">🌿</p>
      <h1 className="text-3xl font-bold text-emerald-700">植物收藏家</h1>
      <p className="text-sm text-stone-400 mt-2 mb-8">Zitadel 单点登录</p>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <form method="POST" action="/api/auth/signin/zitadel">
          <input type="hidden" name="csrfToken" value={csrf} />
          <input type="hidden" name="callbackUrl" value={redirect} />
          <button
            type="submit"
            className="w-full bg-emerald-700 text-white py-3 rounded-xl text-lg font-bold hover:bg-emerald-800 transition-colors"
          >
            登录
          </button>
        </form>

        <form method="POST" action="/api/auth/signin/zitadel">
          <input type="hidden" name="csrfToken" value={csrf} />
          <input type="hidden" name="callbackUrl" value={redirect} />
          <input type="hidden" name="prompt" value="create" />
          <button
            type="submit"
            className="w-full bg-white border-2 border-emerald-600 text-emerald-700 py-3 rounded-xl text-lg font-bold hover:bg-emerald-50 transition-colors"
          >
            注册
          </button>
        </form>
      </div>

      <noscript>
        <p className="text-xs text-stone-400 mt-6">纯 HTML 表单, 无需 JavaScript</p>
      </noscript>
    </main>
  );
}
