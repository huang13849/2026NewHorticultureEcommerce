const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = process.env.PORT || 3011;
const SITE_URL = process.env.SITE_URL || 'https://horiculture.space';
const SITE_URLS = (process.env.SITE_URLS || `${SITE_URL},http://106.12.91.182,https://2026newhorticultureecommerce.pages.dev`).split(',').map(s => s.trim()).filter(Boolean);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || '';
const CF_ZONE_NAME = process.env.CLOUDFLARE_ZONE_NAME || 'horiculture.space';
const LOG_FILE = path.join(DATA_DIR, 'pageviews.jsonl');
fs.mkdirSync(DATA_DIR, { recursive: true });

const KEYWORDS = ['植物猎人','Plant Hunter','植物猎人 花卉','植物猎人 Plant Hunter','花卉供应链','花卉供应链平台','园艺电商','苗木批发拍卖','flower supply chain','plant hunter horticulture','smart flower supply chain','horticulture ecommerce','garden plant marketplace','map flower shopping','wholesale flower auction','reverse flower auction','green certification carbon credit trees'];

function send(res, code, obj, headers={}) { const body = typeof obj === 'string' ? obj : JSON.stringify(obj); res.writeHead(code, { 'content-type': typeof obj === 'string' ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type', ...headers }); res.end(body); }
function jsonLine(obj) { fs.appendFile(LOG_FILE, JSON.stringify(obj) + '\n', () => {}); }
function readLines(max = 50000) { if (!fs.existsSync(LOG_FILE)) return []; const txt = fs.readFileSync(LOG_FILE, 'utf8'); return txt.trim().split('\n').filter(Boolean).slice(-max).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); }
function bodyJson(req) { return new Promise(resolve => { let data=''; req.on('data', c => data += c); req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); } }); }); }
function dayOf(ts) { return new Date(ts).toISOString().slice(0, 10); }
function safeUrl(u) { try { return new URL(u).toString(); } catch { return SITE_URL; } }
function hostOf(u) { try { return new URL(u).hostname; } catch { return String(u || '').replace(/^https?:\/\//,'').split('/')[0] || 'unknown'; } }
async function fetchText(url, timeoutMs = 12000) { const ctrl = new AbortController(); const id = setTimeout(() => ctrl.abort(), timeoutMs); try { const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0 SEOService/1.0' } }); const text = await res.text(); return { ok: res.ok, status: res.status, text, headers: Object.fromEntries(res.headers.entries()) }; } finally { clearTimeout(id); } }
function extract(html, re) { const m = html.match(re); return m ? m[1].trim().replace(/\s+/g, ' ') : ''; }
function count(re, s) { return (s.match(re) || []).length; }
function safeRef(r) { try { return new URL(r).hostname; } catch { return String(r).slice(0,80); } }
function top(obj) { return Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,value])=>({name,value})); }
function buildRecommendations(x, target) { const out=[]; const targetHost = hostOf(target); if (!x.title || x.title.length < 8 || x.title.length > 80) out.push('首页 title 控制在 8-80 字符，包含“植物猎人/Plant Hunter”和核心业务词。'); if (!x.desc || x.desc.length < 35 || x.desc.length > 180) out.push('description 控制在 35-180 字符，写清业务和品牌。'); if (!x.canonical) out.push('增加 canonical，避免重复收录。'); else if (!(x.canonical.includes('horiculture.space') || targetHost === '106.12.91.182')) out.push('canonical 建议统一指向国外主域 horiculture.space；国内苏州站保留独立入口。'); if (!x.ogTitle) out.push('增加 OpenGraph/Twitter Card，提升分享点击率。'); if (!x.jsonLdCount) out.push('增加 JSON-LD 结构化数据：WebSite、Organization、ItemList。'); if (x.h1Count !== 1) out.push('每个页面保持一个明确 H1。'); if (x.imgWithoutAlt > 0) out.push(`有 ${x.imgWithoutAlt} 张图片缺 alt。`); if (!x.robotsOk) out.push('补 robots.txt。'); if (!x.sitemapOk) out.push('补 sitemap.xml 并提交搜索引擎。'); if (targetHost !== 'horiculture.space' && targetHost !== '106.12.91.182') out.push('国外备用域建议 301 到 horiculture.space；国内苏州站可保留独立入口并用独立监控。'); return out; }


function cfRequestJson(pathname, { method = 'GET', body = null } = {}) {
  if (!CF_API_TOKEN) return Promise.reject(new Error('Cloudflare API Token 未配置'));
  const payload = body ? JSON.stringify(body) : null;
  const forcedIp = process.env.CLOUDFLARE_API_IP || '104.19.192.177';
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.cloudflare.com',
      servername: 'api.cloudflare.com',
      path: pathname.startsWith('/client/v4') ? pathname : `/client/v4${pathname}`,
      method,
      timeout: 25000,
      lookup: (_host, opts, cb) => {
        if (typeof opts === 'function') { cb = opts; opts = {}; }
        if (opts?.all) cb(null, [{ address: forcedIp, family: 4 }]);
        else cb(null, forcedIp, 4);
      },
      headers: {
        authorization: `Bearer ${CF_API_TOKEN}`,
        ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(raw || '{}')); }
        catch (e) { reject(new Error(`Cloudflare API JSON parse failed: ${e.message}; status=${res.statusCode}`)); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('Cloudflare API timeout')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function cfApi(pathname) {
  const data = await cfRequestJson(pathname);
  if (!data.success) throw new Error((data.errors || []).map(e => e.message).join('; ') || 'Cloudflare API error');
  return data.result;
}
async function getCfZoneId() {
  if (CF_ZONE_ID) return CF_ZONE_ID;
  const zones = await cfApi(`/zones?name=${encodeURIComponent(CF_ZONE_NAME)}`);
  if (!zones || !zones[0]?.id) throw new Error(`Cloudflare Zone not found: ${CF_ZONE_NAME}`);
  return zones[0].id;
}
async function verifyCloudflareToken() {
  if (!CF_API_TOKEN) return { configured: false, valid: false, error: 'Cloudflare API Token 未配置' };
  const data = await cfRequestJson('/client/v4/user/tokens/verify');
  return {
    configured: true,
    valid: !!data.success,
    status: data.result?.status || null,
    id: data.result?.id || null,
    errors: data.errors || [],
  };
}
async function fetchCloudflareAnalytics(days = 30) {
  if (!CF_API_TOKEN) return { configured: false, error: 'Cloudflare API Token 未配置' };
  const zoneTag = await getCfZoneId();
  const end = new Date();
  const start = new Date(Date.now() - (Math.max(1, days) - 1) * 86400000);
  const since = start.toISOString().slice(0, 10);
  const until = end.toISOString().slice(0, 10);
  const query = `query($zoneTag: string, $since: Date!, $until: Date!, $limit: Int!) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        httpRequests1dGroups(limit: $limit, filter: { date_geq: $since, date_leq: $until }) {
          dimensions { date }
          sum { requests pageViews bytes cachedRequests threats }
          uniq { uniques }
        }
      }
    }
  }`;
  const data = await cfRequestJson('/client/v4/graphql', {
    method: 'POST',
    body: { query, variables: { zoneTag, since, until, limit: Math.max(1, days) } },
  });
  if (data.errors?.length) throw new Error(data.errors.map(e => e.message).join('; '));
  const groups = data.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];
  const byDay = {};
  let requests = 0, pageViews = 0, uniques = 0, bytes = 0, cachedRequests = 0, threats = 0;
  for (const g of groups) {
    const d = g.dimensions?.date;
    const req = g.sum?.requests || 0;
    const pv = g.sum?.pageViews || 0;
    const un = g.uniq?.uniques || 0;
    byDay[d] = { requests: req, pageViews: pv, uniques: un };
    requests += req;
    pageViews += pv;
    uniques += un;
    bytes += g.sum?.bytes || 0;
    cachedRequests += g.sum?.cachedRequests || 0;
    threats += g.sum?.threats || 0;
  }
  return {
    configured: true,
    source: 'cloudflare',
    zoneName: CF_ZONE_NAME,
    zoneTag,
    accountId: CF_ACCOUNT_ID || null,
    days,
    since,
    until,
    requests,
    pageViews,
    uniques,
    bytes,
    cachedRequests,
    threats,
    byDay,
    note: 'Cloudflare 真实边缘统计；uniques 为 Cloudflare 估算独立访客。',
  };
}

function analyticsSummary(days = 30, hostFilter = '') { const lines=readLines(); const since=Date.now()-days*86400000; const recent=lines.filter(x=>Date.parse(x.ts)>=since && (!hostFilter || x.host === hostFilter)); const byDay={}, byPath={}, byReferrer={}, byLang={}, byHost={}; const visitors=new Set(); for (const x of recent) { byDay[dayOf(x.ts)] = (byDay[dayOf(x.ts)] || 0) + 1; byPath[x.path || '/']=(byPath[x.path || '/']||0)+1; const ref=x.referrer?safeRef(x.referrer):'direct'; byReferrer[ref]=(byReferrer[ref]||0)+1; const h=x.host || hostOf(x.origin) || 'unknown'; byHost[h]=(byHost[h]||0)+1; if(x.lang) byLang[x.lang]=(byLang[x.lang]||0)+1; if(x.ipHash) visitors.add(`${h}:${x.ipHash}`); } return { days, host: hostFilter || 'all', pageviews: recent.length, estimatedVisitors: visitors.size, byDay, byHost, topHosts: top(byHost), topPages: top(byPath), topReferrers: top(byReferrer), languages: top(byLang), note: '访问人数是基于埋点日志的估算独立访客；历史 Cloudflare/Google 数据需要配置对应 API Token。' }; }
async function auditOne(target) { const [home,robots,sitemap]=await Promise.allSettled([fetchText(target), fetchText(new URL('/robots.txt', target).toString(),6000), fetchText(new URL('/sitemap.xml', target).toString(),6000)]); const h=home.value?.text || ''; const title=extract(h, /<title[^>]*>([\s\S]*?)<\/title>/i); const desc=extract(h, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || extract(h, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i); const canonical=extract(h, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i); const ogTitle=extract(h, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i); const jsonLdCount=count(/<script[^>]+type=["']application\/ld\+json["']/gi,h); const h1Count=count(/<h1[\s>]/gi,h); const imgWithoutAlt=count(/<img(?![^>]*\balt=)[^>]*>/gi,h); const hasBrand=/植物猎人|Plant Hunter/i.test(h + title + desc); const targetHost=hostOf(target); const scoreParts=[title.length>=8&&title.length<=80, desc.length>=35&&desc.length<=180, !!canonical, (canonical.includes('horiculture.space') || targetHost === '106.12.91.182'), !!ogTitle, jsonLdCount>0, h1Count===1, robots.value?.ok, sitemap.value?.ok, hasBrand]; const score=Math.round(scoreParts.filter(Boolean).length/scoreParts.length*100); return { target, host: hostOf(target), checkedAt: new Date().toISOString(), score, status: home.value?.status || 0, title, description: desc, canonical, ogTitle, jsonLdCount, h1Count, imgWithoutAlt, hasBrand, robots: { ok: !!robots.value?.ok, status: robots.value?.status || 0 }, sitemap: { ok: !!sitemap.value?.ok, status: sitemap.value?.status || 0 }, recommendations: buildRecommendations({ title, desc, canonical, ogTitle, jsonLdCount, h1Count, imgWithoutAlt, robotsOk: robots.value?.ok, sitemapOk: sitemap.value?.ok }, target) }; }

async function handle(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname === '/' || url.pathname === '/index.html') return send(res, 200, '<!doctype html><meta charset="utf-8"><title>SEO Service</title><body style="font-family:system-ui;padding:40px"><h1>SEO Service</h1><p>API: <a href="/api/health">/api/health</a> · <a href="/api/seo/audit-all">/api/seo/audit-all</a> · <a href="/api/seo/rankings">/api/seo/rankings</a> · <a href="/api/analytics/summary">/api/analytics/summary</a></p></body>');
    if (url.pathname === '/api/health') return send(res, 200, { status: 'ok', service: 'seo-service', site: SITE_URL, sites: SITE_URLS, time: new Date().toISOString() });
    if (url.pathname === '/api/track' && req.method === 'POST') { const b = await bodyJson(req); const ip = (req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0]; const host = String(b.host || hostOf(b.origin) || req.headers.host || 'unknown').slice(0,120); jsonLine({ ts: new Date().toISOString(), host, origin: String(b.origin || '').slice(0,200), path: String(b.path || '/').slice(0,300), referrer: String(b.referrer || '').slice(0,500), title: String(b.title || '').slice(0,200), lang: String(b.lang || '').slice(0,20), screen: String(b.screen || '').slice(0,50), ua: String(req.headers['user-agent'] || '').slice(0,300), ipHash: Buffer.from(ip).toString('base64').slice(0,16) }); return send(res, 200, { ok: true }); }
    if (url.pathname === '/api/analytics/summary') return send(res, 200, analyticsSummary(Number(url.searchParams.get('days') || 30), url.searchParams.get('host') || ''));
    if (url.pathname === '/api/analytics/cloudflare') { try { return send(res, 200, await fetchCloudflareAnalytics(Number(url.searchParams.get('days') || 30))); } catch (e) { return send(res, 200, { configured: !!CF_API_TOKEN, source: 'cloudflare', error: e.message, note: 'Cloudflare Analytics 暂不可用，检查 Token 权限或 Zone。' }); } }
    if (url.pathname === '/api/cloudflare/verify') return send(res, 200, await verifyCloudflareToken());
    if (url.pathname === '/api/seo/audit') return send(res, 200, await auditOne(safeUrl(url.searchParams.get('url') || SITE_URL)));
    if (url.pathname === '/api/seo/audit-all') return send(res, 200, { primary: SITE_URL, sites: await Promise.all(SITE_URLS.map(auditOne)) });
    if (url.pathname === '/api/seo/rankings') { const keywords=String(url.searchParams.get('keywords') || KEYWORDS.join('\n')).split(/[\n,，]+/).map(s=>s.trim()).filter(Boolean).slice(0,20); const domains=SITE_URLS.map(hostOf); const results=[]; for (const keyword of keywords) { const searchUrl='https://www.bing.com/search?q='+encodeURIComponent(keyword)+'&count=20'; try { const {text}=await fetchText(searchUrl,8000); const urls=[...text.matchAll(/<a href="(https?:\/\/[^"#]+)"/g)].map(m=>m[1]).filter(u=>!u.includes('bing.com')); const matches=domains.map(domain=>{ const pos=urls.findIndex(u=>{ try { return new URL(u).hostname.includes(domain); } catch { return false; } }); return { domain, rank: pos>=0?pos+1:null, found:pos>=0 }; }); results.push({ keyword, engine:'bing', matches, found: matches.some(m=>m.found), checkedAt:new Date().toISOString() }); } catch(e) { results.push({ keyword, engine:'bing', matches: domains.map(domain=>({domain, rank:null, found:false})), found:false, error:e.name==='AbortError'?'timeout':e.message, checkedAt:new Date().toISOString() }); } } return send(res, 200, { site:SITE_URL, domains, results, note:'公开搜索结果会因地区/个性化波动；准确排名建议接入 Google Search Console / Bing Webmaster Tools API。' }); }
    if (url.pathname === '/api/seo/keywords') return send(res, 200, { keywords: KEYWORDS });
    return send(res, 404, { error: 'not found' });
  } catch (e) { return send(res, 500, { error: e.message }); }
}
http.createServer(handle).listen(PORT, '0.0.0.0', () => console.log(`SEO service listening on ${PORT}, primary=${SITE_URL}`));
