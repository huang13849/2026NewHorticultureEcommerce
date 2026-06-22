const API_ORIGIN = 'http://106-12-91-182.sslip.io';
const OVERSEAS_ORIGIN = 'https://horiculture.space';

function rewriteMinioUrls(value) {
  if (typeof value === 'string') {
    return value
      .replaceAll('http://100.96.54.109:9000/supply-chain/', `${OVERSEAS_ORIGIN}/minio/supply-chain/`)
      .replaceAll('http://106.12.91.182/minio/supply-chain/', `${OVERSEAS_ORIGIN}/minio/supply-chain/`)
      .replaceAll('http://106.12.91.182:9000/supply-chain/', `${OVERSEAS_ORIGIN}/minio/supply-chain/`);
  }
  if (Array.isArray(value)) return value.map(rewriteMinioUrls);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, nested] of Object.entries(value)) out[key] = rewriteMinioUrls(nested);
    return out;
  }
  return value;
}

function corsHeaders(headers = {}) {
  const out = new Headers(headers);
  out.set('Access-Control-Allow-Origin', '*');
  out.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS');
  out.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  return out;
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });

  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, API_ORIGIN);
  const headers = new Headers(request.headers);
  headers.set('Host', new URL(API_ORIGIN).host);
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ipcountry');
  headers.delete('cf-ray');
  headers.delete('cf-visitor');

  const init = { method: request.method, headers, redirect: 'manual' };
  if (!['GET', 'HEAD'].includes(request.method)) init.body = request.body;

  const upstream = await fetch(target.toString(), init);
  const contentType = upstream.headers.get('content-type') || '';
  const responseHeaders = corsHeaders(upstream.headers);
  responseHeaders.delete('content-length');
  responseHeaders.delete('content-encoding');

  if (request.method === 'HEAD') {
    return new Response(null, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  }

  if (contentType.includes('application/json')) {
    const data = await upstream.json();
    return new Response(JSON.stringify(rewriteMinioUrls(data)), {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
