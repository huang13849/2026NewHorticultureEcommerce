import { NextRequest, NextResponse } from 'next/server';
const UPSTREAM =
  process.env.PEONY_SUPPLIER_URL ||
  'http://supplier-service.supply-chain.svc.cluster.local:3002';
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone');
  if (!phone) return NextResponse.json({ error: 'phone_required' }, { status: 400 });
  const r = await fetch(UPSTREAM + '/api/peony-alliance/me/' + encodeURIComponent(phone));
  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: { 'content-type': r.headers.get('content-type') || 'application/json' },
  });
}
