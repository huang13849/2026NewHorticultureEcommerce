// Proxy to mobile-auth-service in peony ns
import { NextRequest, NextResponse } from 'next/server';

const UPSTREAM =
  process.env.PEONY_MOBILE_AUTH_URL ||
  'http://mobile-auth-service.peony.svc.cluster.local:3020';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const r = await fetch(UPSTREAM + '/api/mobile-auth/register-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    return new NextResponse(text, {
      status: r.status,
      headers: { 'content-type': r.headers.get('content-type') || 'application/json' },
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'proxy_error', detail: e?.message }, { status: 502 });
  }
}
