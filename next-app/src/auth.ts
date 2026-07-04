// next-app/src/auth.ts
// NextAuth v5 (Auth.js beta) 接入 Zitadel OIDC。
// 同一套代码通过 host header 分区:
//   horiculture.club / www.horiculture.club → club-web (中文, CLUB_* 环境变量)
//   horiculture.space (及其它默认)          → space-web (英文, SPACE_* 环境变量)
// 因为 self-hosted Zitadel 的 issuer 是 http://100.96.54.109:31111，官方
// @auth/core/providers/zitadel 的默认发现有限制，这里手写一个通用 oidc provider。
import NextAuth, { type NextAuthConfig } from 'next-auth';
import { headers } from 'next/headers';

const ZITADEL_ISSUER = process.env.ZITADEL_ISSUER || 'http://100.96.54.109:31111';

interface ClientPair {
  clientId: string;
  clientSecret: string;
  brand: 'club' | 'space';
}

async function pickClient(): Promise<ClientPair> {
  let host = '';
  try {
    const h = await headers();
    host = (h.get('x-forwarded-host') || h.get('host') || '').toLowerCase();
  } catch {
    host = '';
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

// Auth.js v5 支持 config 作为一个函数：每个请求都会重新 evaluate providers，
// 这样可以按 host 动态挑 client_id / client_secret。
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
            scope: 'openid profile email offline_access',
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
      async jwt({ token, account, profile }) {
        if (account) {
          token.accessToken = account.access_token;
          token.idToken = account.id_token;
          token.expiresAt = account.expires_at;
          token.brand = brand;
        }
        if (profile) {
          const p = profile as Record<string, unknown>;
          token.sub = String(p.sub ?? token.sub ?? '');
        }
        return token;
      },
      async session({ session, token }) {
        (session as unknown as Record<string, unknown>).brand = token.brand;
        (session as unknown as Record<string, unknown>).accessToken = token.accessToken;
        return session;
      },
    },
    pages: {
      error: '/login',
    },
  };
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
