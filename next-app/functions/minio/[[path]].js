const MINIO_ORIGIN = 'http://106-12-91-182.sslip.io';

export async function onRequest(context) {
  const { request } = context;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return new Response('Method Not Allowed', { status: 405 });
  }
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Range',
      },
    });
  }
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, MINIO_ORIGIN);
  const headers = new Headers(request.headers);
  headers.set('Host', new URL(MINIO_ORIGIN).host);

  const upstream = await fetch(target.toString(), { method: request.method, headers, redirect: 'follow' });
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Cache-Control', responseHeaders.get('Cache-Control') || 'public, max-age=86400');
  responseHeaders.delete('content-encoding');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
