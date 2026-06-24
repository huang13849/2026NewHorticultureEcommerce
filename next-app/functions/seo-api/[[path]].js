const SEO_ORIGIN = 'http://106-12-91-182.sslip.io';

function corsHeaders(headers = {}) {
  const out = new Headers(headers);
  out.set('Access-Control-Allow-Origin', '*');
  out.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS');
  out.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  return out;
}

// /seo-api/* -> suzhou seo-service (behind nginx /seo-api/)
export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });

  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, SEO_ORIGIN);
  const headers = new Headers(request.headers);
  headers.set('Host', new URL(SEO_ORIGIN).host);
  headers.delete('cf-ipcountry');
  headers.delete('cf-ray');
  headers.delete('cf-visitor');

  const init = { method: request.method, headers, redirect: 'manual' };
  if (!['GET', 'HEAD'].includes(request.method)) init.body = request.body;

  const upstream = await fetch(target.toString(), init);
  const responseHeaders = corsHeaders(upstream.headers);
  responseHeaders.delete('content-length');
  responseHeaders.delete('content-encoding');

  if (request.method === 'HEAD') {
    return new Response(null, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders });
  }
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders });
}
