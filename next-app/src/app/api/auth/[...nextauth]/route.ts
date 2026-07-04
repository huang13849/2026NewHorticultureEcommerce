// next-app/src/app/api/auth/[...nextauth]/route.ts
// NextAuth v5 handlers — GET + POST 都由 Auth.js 处理 (signIn / callback / signOut / session / providers)
import { handlers } from '@/auth';

export const { GET, POST } = handlers;

// 强制 dynamic，避免被静态化
export const dynamic = 'force-dynamic';
