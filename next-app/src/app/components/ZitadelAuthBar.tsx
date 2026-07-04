// next-app/src/app/components/ZitadelAuthBar.tsx
// Server component: 显示当前 Zitadel 登录状态 + 登录/登出按钮。
import { auth, signIn, signOut } from '@/auth';

export default async function ZitadelAuthBar() {
  const session = await auth();

  if (!session?.user) {
    return (
      <form
        action={async () => {
          'use server';
          await signIn('zitadel', { redirectTo: '/' });
        }}
      >
        <button
          type="submit"
          className="rounded bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-700"
        >
          Zitadel 登录
        </button>
      </form>
    );
  }

  const label = session.user.name || session.user.email || '已登录';
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-stone-600">👤 {label}</span>
      <form
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/' });
        }}
      >
        <button
          type="submit"
          className="rounded border border-stone-300 px-2 py-0.5 text-xs text-stone-700 hover:bg-stone-100"
        >
          登出
        </button>
      </form>
    </div>
  );
}
