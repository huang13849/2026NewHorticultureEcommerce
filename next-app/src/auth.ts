// next-app/src/auth.ts
// NextAuth v5 接入 Zitadel OIDC —— OIDC-only 模式 (2026-07-05)
// - 一份代码, 双站点 (club/space) 根据 host 挑 client
// - jwt callback 里用 id_token 交换 flower-api 的本地 flower_token, 塞进 session
//   前端 useEffect 从 session 拿 flower_token 写 localStorage, 兼容旧的 useAuth()
import NextAuth, { type NextAuthConfig } from 'next-auth';
import { headers } from 'next/headers';

const ZITADEL_ISSUER = process.env.ZITADEL_ISSUER || 'https://id.horiculture.club';
// flower-api 内部地址 (k3s svc / 本机)
const FLOWER_API_INTERNAL = process.env.FLOWER_API_INTERNAL
  || process.env.FLOWER_API_URL
  || 'http://flower-api.new-ecommerce.svc.cluster.local:3010';

interface ClientPair {
  clientId: string;
  clientSecret: string;
  brand: 'club' | 'space' | 'la';
}

async function pickClient(): Promise<ClientPair> {
  let host = '';
  try {
    const h = await headers();
    host = (h.get('x-forwarded-host') || h.get('host') || '').toLowerCase();
  } catch {
    host = '';
  }
  const isLa = host.startsWith('209.141.34.146') || host === '209.141.34.146:80';
  if (isLa) {
    return {
      brand: 'la' as unknown as 'space',
      clientId: process.env.LA_CLIENT_ID || '',
      clientSecret: process.env.LA_CLIENT_SECRET || '',
    };
  }
  const isClub = host.includes('horiculture.club');
  if (isClub) {
    return {
      brand: 'club',
      clientId: process.env.CLUB_CLIENT_ID || '',
      clientSecret: process.env.CLUB_CLIENT_SECRET || '',
    };
  }
  return {
    brand: 'space',
    clientId: process.env.SPACE_CLIENT_ID || '',
    clientSecret: process.env.SPACE_CLIENT_SECRET || '',
  };
}

async function exchangeFlowerToken(idToken: string): Promise<{ token: string; user: Record<string, unknown> } | null> {
  try {
    const r = await fetch(`${FLOWER_API_INTERNAL}/api/auth/sso-callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken }),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.warn('[auth] flower sso-callback', r.status, body.slice(0, 200));
      return null;
    }
    return (await r.json()) as { token: string; user: Record<string, unknown> };
  } catch (e) {
    console.warn('[auth] flower sso-callback fetch failed:', e);
    return null;
  }
}

const authConfig = async (): Promise<NextAuthConfig> => {
  const { clientId, clientSecret, brand } = await pickClient();

  return {
    trustHost: true,
    session: { strategy: 'jwt' },
    providers: [
      {
        id: 'zitadel',
        name: 'Zitadel',
        type: 'oidc',
        issuer: ZITADEL_ISSUER,
        clientId,
        clientSecret,
        checks: ['pkce', 'state'],
        authorization: {
          params: {
            scope: 'openid profile email phone offline_access',
            ui_locales: 'zh-CN',
          },
        },
        wellKnown: `${ZITADEL_ISSUER}/.well-known/openid-configuration`,
        idToken: true,
        profile(profile: Record<string, unknown>) {
          return {
            id: String(profile.sub ?? ''),
            name: (profile.name as string) || (profile.preferred_username as string) || '',
            email: (profile.email as string) || null,
            image: (profile.picture as string) || null,
          };
        },
      },
    ],
    callbacks: {
      async jwt({ token, account }) {
        // 登录成功那一次 (account 只在第一次 available), 用 id_token 换 flower_token
        if (account?.id_token) {
          token.idToken = account.id_token as string;
          token.brand = brand;
          const exchanged = await exchangeFlowerToken(account.id_token as string);
          if (exchanged) {
            token.flowerToken = exchanged.token;
            token.flowerUser = exchanged.user;
          } else {
            token.flowerToken = null;
            token.flowerUser = null;
          }
        }
        return token;
      },
      async session({ session, token }) {
        (session as unknown as Record<string, unknown>).brand = token.brand;
        (session as unknown as Record<string, unknown>).flowerToken = token.flowerToken;
        (session as unknown as Record<string, unknown>).flowerUser = token.flowerUser;
        return session;
      },
    },
    pages: {
      error: '/login',
    },
  };
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
