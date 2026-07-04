// /login — SSO-only, server component (跟 ZitadelAuthBar 同款模式)
// 两个按钮 [登录] [注册], 均走 Zitadel authorize; 注册按钮加 prompt=create hint。
// 使用 server action signIn 触发, 完全跳过客户端 fetch/CSRF/URL 构造。
import { signIn } from '@/auth';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const redirectTo = sp?.redirect || '/';

  return (
    <main className="min-h-screen bg-white text-stone-900 flex flex-col items-center justify-center px-8">
      <p className="text-6xl mb-4">🌿</p>
      <h1 className="text-3xl font-bold text-emerald-700">植物收藏家</h1>
      <p className="text-sm text-stone-400 mt-2 mb-8">Zitadel 单点登录</p>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <form
          action={async () => {
            'use server';
            await signIn('zitadel', { redirectTo });
          }}
        >
          <button
            type="submit"
            className="w-full bg-emerald-700 text-white py-3 rounded-xl text-lg font-bold hover:bg-emerald-800 transition-colors"
          >
            登录
          </button>
        </form>

        <form
          action={async () => {
            'use server';
            await signIn('zitadel', {
              redirectTo,
              authorizationParams: { prompt: 'create' },
            } as unknown as Parameters<typeof signIn>[1]);
          }}
        >
          <button
            type="submit"
            className="w-full bg-white border-2 border-emerald-600 text-emerald-700 py-3 rounded-xl text-lg font-bold hover:bg-emerald-50 transition-colors"
          >
            注册
          </button>
        </form>
      </div>
    </main>
  );
}
