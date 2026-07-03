import type { Metadata } from 'next';
import { IS_CN } from '@/lib/deploy';

// 禁止静态生成:构建期 fetch /seo-api 相对路径会失败,改为运行时按需渲染
export const dynamic = process.env.NEXT_PUBLIC_REGION === 'global' ? 'auto' : 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'SEO 管理 | 植物猎人 Plant Hunter',
  description: 'Simple SEO dashboard for traffic, keyword ranking, and next actions.',
  alternates: { canonical: '/seo' },
  robots: { index: false, follow: false },
};

const SEO_API = process.env.NEXT_PUBLIC_SEO_API_URL || (IS_CN ? '/seo-api' : 'http://106.12.91.182/seo-api');
const FLOWER_API = process.env.NEXT_PUBLIC_API_URL || "/api";
const OVERSEAS_DOMAIN = 'horiculture.space';
const DOMESTIC_DOMAIN = '106.12.91.182';
const OVERSEAS_URL = 'https://horiculture.space';
const DOMESTIC_URL = 'http://106.12.91.182';

type Audit = {
  score: number;
  status?: number;
  host: string;
  canonical: string;
  hasBrand?: boolean;
  robots: { ok: boolean; status: number };
  sitemap: { ok: boolean; status: number };
  recommendations: string[];
};
type RankingMatch = { domain: string; rank: number | null; found: boolean };
type Ranking = { keyword: string; engine: string; matches?: RankingMatch[]; found: boolean; error?: string };
type CloudflareAnalytics = {
  configured?: boolean;
  error?: string;
  requests?: number;
  pageViews?: number;
  uniques?: number;
  threats?: number;
  byDay?: Record<string, { requests: number; pageViews: number; uniques: number }>;
};
type Analytics = {
  pageviews?: number;
  estimatedVisitors?: number;
  byDay?: Record<string, number>;
  topPages: {name:string; value:number}[];
  topReferrers: {name:string; value:number}[];
};
type SearchLog = { id: number; keyword: string; normalized_keyword: string; result_count: number; region_code?: string; lang?: string; source?: string; created_at: string };
type SearchLogsResp = { logs: SearchLog[]; total: number };
type TrendItem = { keyword: string; score: number; momentum: 'high'|'medium'|'low'|string; source: string; audience: string; summary: string; adTitle: string; adCopy: string; visualPrompt: string; cta: string; route: string; tags?: string[]; sources?: string[] };
type TrendsResp = { updatedAt?: string; nextUpdateHint?: string; domestic: TrendItem[]; overseas: TrendItem[]; allKeywords?: string[] };

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${SEO_API}${path}`, { next: { revalidate: 300 } });
    if (!res.ok) return fallback;
    return res.json();
  } catch { return fallback; }
}


async function getFlowerJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${FLOWER_API}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return fallback;
    return res.json();
  } catch { return fallback; }
}

function rankText(rank?: number | null) {
  return rank ? `#${rank}` : '未进前20';
}

export default async function SeoDashboardPage() {
  const [auditAll, rankingData, analytics, cloudflare, searchLogsResp, trends] = await Promise.all([
    getJson<{primary: string; sites: Audit[]}>('/api/seo/audit-all', { primary: OVERSEAS_URL, sites: [] }),
    getJson<{results: Ranking[]; note: string}>('/api/seo/rankings', { results: [], note: '' }),
    getJson<Analytics>(`/api/analytics/summary?days=30${IS_CN ? '&host=106.12.91.182' : ''}`, { topPages: [], topReferrers: [] }),
    getJson<CloudflareAnalytics>('/api/analytics/cloudflare?days=30', { configured: false, error: 'Cloudflare Analytics 暂不可用' }),
    getFlowerJson<SearchLogsResp>('/search/logs?limit=200', { logs: [], total: 0 }),
    getJson<TrendsResp>('/api/seo/trends', { domestic: [], overseas: [], allKeywords: [] }),
  ]);

  const audits = auditAll.sites || [];
  const overseasAudit = audits.find(a => a.host === OVERSEAS_DOMAIN) || audits[0] || { score: 0, host: OVERSEAS_DOMAIN, canonical: '', hasBrand: false, robots: { ok: false, status: 0 }, sitemap: { ok: false, status: 0 }, recommendations: ['SEO service 暂时不可达'] };
  const domesticAudit = audits.find(a => a.host === DOMESTIC_DOMAIN) || { score: 0, host: DOMESTIC_DOMAIN, canonical: '', hasBrand: false, robots: { ok: false, status: 0 }, sitemap: { ok: false, status: 0 }, recommendations: ['国内苏州站暂未返回 SEO 审计数据'] };
  const primaryAudit = overseasAudit;
  const rankings = (rankingData.results || []).slice(0, 10);
  const rankedCount = rankings.filter(r => (r.matches || []).some(m => m.found) || r.found).length;
  // 访问趋势：国内看站内埋点(苏州 host)，国际看 Cloudflare
  const trendDays: { label: string; value: number; sub: string }[] = IS_CN
    ? Object.entries(analytics.byDay || {}).sort(([a],[b]) => a.localeCompare(b)).slice(-14).map(([d, v]) => ({ label: d.slice(5), value: Number(v) || 0, sub: `${Number(v) || 0} PV` }))
    : Object.entries(cloudflare.byDay || {}).sort(([a],[b]) => a.localeCompare(b)).slice(-14).map(([d, v]) => ({ label: d.slice(5), value: v.pageViews || v.requests || 0, sub: `${v.pageViews || v.requests || 0} PV · ${v.uniques || 0} 人` }));
  const maxPv = Math.max(1, ...trendDays.map(d => d.value));
  const searchLogs = searchLogsResp.logs || [];
  const keywordStats = Object.values(searchLogs.reduce((acc, x) => {
    const key = x.normalized_keyword || x.keyword;
    if (!acc[key]) acc[key] = { keyword: x.keyword, count: 0, results: 0, last: x.created_at };
    acc[key].count += 1;
    acc[key].results += Number(x.result_count || 0);
    if (x.created_at > acc[key].last) acc[key].last = x.created_at;
    return acc;
  }, {} as Record<string, { keyword: string; count: number; results: number; last: string }>)).sort((a,b) => b.count - a.count).slice(0, 12);
  return (
    <main className="min-h-screen bg-slate-950 text-white px-5 py-8">
      <div className="max-w-5xl mx-auto space-y-5">
        <header className="flex items-start justify-between gap-4">
          <div>
            <a href="/admin" className="text-emerald-300 text-sm">← 返回管理后台</a>
            <h1 className="text-3xl md:text-4xl font-bold mt-3">SEO 管理{IS_CN ? ' · 国内版' : ' · 国际版'}</h1>
            <p className="text-slate-400 mt-2">{IS_CN ? '国内：106.12.91.182（苏州） · 品牌词：植物猎人' : '国外：horiculture.space · 品牌词：植物猎人 / Plant Hunter'}</p>
          </div>
          <a href={IS_CN ? DOMESTIC_URL : OVERSEAS_URL} className="hidden md:inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200">{IS_CN ? '打开国内站' : '打开国外站'}</a>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {IS_CN ? (
            <>
              <Metric title="国内 SEO" value={`${domesticAudit.score || 0}`} sub="苏州 nginx" tone="sky" />
              <Metric title="30天 PV" value={String(analytics.pageviews ?? 0)} sub="站内埋点" tone="violet" />
              <Metric title="估算访客" value={String(analytics.estimatedVisitors ?? 0)} sub="近30天" tone="emerald" />
              <Metric title="国内趋势词" value={String((trends.domestic || []).length)} sub="适合中文首页大图" tone="amber" />
            </>
          ) : (
            <>
              <Metric title="国外 SEO" value={`${overseasAudit.score || 0}`} sub="horiculture.space" tone="emerald" />
              <Metric title="30天 PV" value={String(cloudflare.pageViews ?? 0)} sub="Cloudflare 国外" tone="violet" />
              <Metric title="进前20词" value={String(rankedCount)} sub={`${rankings.length} 个跟踪词`} tone="amber" />
              <Metric title="国外趋势词" value={String((trends.overseas || []).length)} sub="适合海外首页大图" tone="sky" />
            </>
          )}
        </section>

        {!IS_CN && cloudflare.error ? (
          <section className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">Cloudflare 数据暂不可用：{cloudflare.error}</section>
        ) : null}

        <section className="grid grid-cols-1 gap-5">
          <Card title={IS_CN ? '国内访问趋势 · 近14天' : '访问趋势 · 近14天'}>
            <div className="space-y-2">
              {trendDays.length ? trendDays.map((d) => (
                <div key={d.label}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1"><span>{d.label}</span><span>{d.sub}</span></div>
                  <div className="h-2 rounded bg-white/10"><div className="h-2 rounded bg-emerald-400" style={{ width: `${Math.max(4, d.value / maxPv * 100)}%` }} /></div>
                </div>
              )) : <p className="text-slate-400 text-sm">{IS_CN ? '暂无站内访问埋点数据。' : '暂无 Cloudflare 趋势数据。'}</p>}
            </div>
          </Card>
        </section>



        <section className="grid grid-cols-1 gap-5">
          {IS_CN ? (
            <TrendColumn title="国内流行趋势 · 适合中文首页大图" subtitle="点击关键词可直接进入广告创意/落地页素材" items={trends.domestic || []} region="domestic" updatedAt={trends.updatedAt} />
          ) : (
            <TrendColumn title="国外流行趋势 · 适合海外首页大图" subtitle="面向 Google / Bing / Pinterest / TikTok 的英文创意方向" items={trends.overseas || []} region="overseas" updatedAt={trends.updatedAt} />
          )}
        </section>

        <Card title="创意工作台">
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            {(IS_CN ? (trends.domestic || []) : (trends.overseas || [])).slice(0, 6).map((x) => (
              <a key={`${x.keyword}-${x.adTitle}`} href={`/publish?keyword=${encodeURIComponent(x.keyword)}&title=${encodeURIComponent(x.adTitle || '')}&copy=${encodeURIComponent(x.adCopy || '')}`} target="_blank" rel="noopener noreferrer" className="group rounded-2xl border border-white/10 bg-slate-900/70 p-4 hover:border-emerald-300/60 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-emerald-300 font-semibold">#{x.keyword}</span>
                  <span className="text-[10px] rounded-full bg-white/10 px-2 py-0.5 text-slate-300">{x.score}</span>
                </div>
                <h3 className="mt-3 font-bold text-white leading-snug">{x.adTitle}</h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">{x.adCopy}</p>
                <p className="mt-3 text-[11px] text-violet-200 line-clamp-2">🎨 {x.visualPrompt}</p>
                <span className="mt-4 inline-flex text-xs text-emerald-200 group-hover:text-emerald-100">去一键铺货 · 编辑并发布（小红书/公众号）→</span>
              </a>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4">更新时间：{trends.updatedAt ? new Date(trends.updatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '待更新'} · {trends.nextUpdateHint || '趋势数据每日更新。'}</p>
        </Card>

        <section className={IS_CN ? 'grid grid-cols-1 gap-5' : 'grid lg:grid-cols-2 gap-5'}>
          {!IS_CN && (<>
          <Card title="国外关键词排名 · Bing 前20">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400"><tr><th className="text-left py-2">关键词</th><th className="text-right">主域排名</th></tr></thead>
                <tbody>
                  {rankings.map((r) => {
                    const primary = (r.matches || []).find(m => m.domain === OVERSEAS_DOMAIN);
                    return <tr key={r.keyword} className="border-t border-white/10"><td className="py-2 pr-3">{r.keyword}</td><td className="text-right font-semibold">{rankText(primary?.rank)}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="国外基础状态">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Status label="品牌词" ok={!!overseasAudit.hasBrand} />
              <Status label="robots.txt" ok={!!overseasAudit.robots?.ok} />
              <Status label="sitemap.xml" ok={!!overseasAudit.sitemap?.ok} />
              <Status label="国外 canonical" ok={(overseasAudit.canonical || '').includes(OVERSEAS_DOMAIN)} />
            </div>
            {overseasAudit.recommendations?.length ? <p className="text-xs text-amber-200 mt-4">待优化：{overseasAudit.recommendations[0]}</p> : <p className="text-xs text-emerald-200 mt-4">国外基础项正常。</p>}
          </Card>
          </>)}

          {IS_CN && (
          <Card title="国内苏州站基础状态">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Status label="品牌词" ok={!!domesticAudit.hasBrand} />
              <Status label="robots.txt" ok={!!domesticAudit.robots?.ok} />
              <Status label="sitemap.xml" ok={!!domesticAudit.sitemap?.ok} />
              <Status label="苏州 nginx" ok={(domesticAudit.status || 0) >= 200 && (domesticAudit.status || 0) < 400} />
            </div>
            {domesticAudit.recommendations?.length ? <p className="text-xs text-amber-200 mt-4">待优化：{domesticAudit.recommendations[0]}</p> : <p className="text-xs text-emerald-200 mt-4">国内基础项正常。</p>}
            <a href={DOMESTIC_URL} className="inline-flex mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200">打开国内站</a>
          </Card>
          )}
        </section>

        <section className="grid lg:grid-cols-3 gap-5">
          <Card title="站内商品搜索词 · SEO 需求" className="lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400"><tr><th className="text-left py-2">搜索词</th><th className="text-right">次数</th><th className="text-right">平均结果</th><th className="text-right">最近</th></tr></thead>
                <tbody>
                  {keywordStats.length ? keywordStats.map((x) => <tr key={x.keyword} className="border-t border-white/10"><td className="py-2 pr-3 font-medium">{x.keyword}</td><td className="text-right">{x.count}</td><td className="text-right">{Math.round(x.results / Math.max(1, x.count))}</td><td className="text-right text-xs text-slate-400">{x.last?.slice(5, 16).replace('T', ' ')}</td></tr>) : <tr><td className="py-3 text-slate-400" colSpan={4}>暂无搜索记录。</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">数据来源：主页商品搜索框 → flower-api → API Gateway → PostgreSQL 主从集群。</p>
          </Card>
          <Card title="最近搜索明细">
            <div className="space-y-2 text-sm max-h-72 overflow-auto pr-1">
              {searchLogs.slice(0, 12).map(x => <div key={x.id} className="border-b border-white/10 pb-2"><div className="flex justify-between gap-3"><span>{x.keyword}</span><b className="text-emerald-300">{x.result_count}</b></div><p className="text-xs text-slate-500 mt-1">{x.region_code || '-'} · {x.lang || '-'} · {x.created_at?.slice(0, 19).replace('T', ' ')}</p></div>)}
              {!searchLogs.length && <p className="text-slate-400">暂无数据</p>}
            </div>
          </Card>
        </section>

        <section className="grid lg:grid-cols-2 gap-5">
          <Card title="热门页面">
            <List items={analytics.topPages || []} />
          </Card>
          <Card title="访问来源">
            <List items={analytics.topReferrers || []} />
          </Card>
        </section>
      </div>
    </main>
  );
}


function TrendColumn({ title, subtitle, items, region, updatedAt }: { title: string; subtitle: string; items: TrendItem[]; region: 'domestic'|'overseas'; updatedAt?: string }) {
  return (
    <Card title={title}>
      <p className="text-xs text-slate-500 -mt-2 mb-1">{subtitle}</p>
      <p className="text-[11px] text-slate-500 mb-4">共 {items.length} 条 · 更新日期：{updatedAt ? new Date(updatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '待更新'}</p>
      <div className="space-y-3">
        {items.length ? items.map((x, i) => (
          <details key={`${region}-${x.keyword}`} className="group rounded-2xl border border-white/10 bg-slate-900/60 p-4 open:border-emerald-300/40">
            <summary className="cursor-pointer list-none">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">{String(i + 1).padStart(2, '0')}</span>
                    <a href={x.route || `/shop?keyword=${encodeURIComponent(x.keyword)}`} className="font-semibold text-emerald-300 hover:text-emerald-200">{x.keyword}</a>
                    <span className={`text-[10px] rounded-full px-2 py-0.5 ${x.momentum === 'high' ? 'bg-rose-400/15 text-rose-200' : 'bg-amber-400/15 text-amber-200'}`}>{x.momentum === 'high' ? '上升快' : '稳定热'}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{x.summary}</p>
                </div>
                <div className="text-right shrink-0"><div className="text-2xl font-bold text-white">{x.score}</div><div className="text-[10px] text-slate-500">trend</div></div>
              </div>
            </summary>
            <div className="mt-4 border-t border-white/10 pt-4 text-xs text-slate-300 space-y-3">
              <div><b className="text-slate-100">广告标题：</b>{x.adTitle}</div>
              <div><b className="text-slate-100">广告文案：</b>{x.adCopy}</div>
              <div><b className="text-slate-100">画面提示词：</b><span className="text-violet-200">{x.visualPrompt}</span></div>
              <div className="flex flex-wrap gap-2">{(x.tags || []).map(t => <span key={t} className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-slate-300">{t}</span>)}</div>
              <div className="text-slate-500">来源：{x.source} · 人群：{x.audience}</div>
              {(x.sources || []).length ? <div className="space-y-1">{(x.sources || []).slice(0, 2).map(u => <a key={u} href={u} className="block break-all text-sky-300 hover:text-sky-200">{u}</a>)}</div> : null}
            </div>
          </details>
        )) : <p className="text-slate-400 text-sm">暂无趋势数据。</p>}
      </div>
    </Card>
  );
}

function Metric({ title, value, sub, tone }: { title: string; value: string; sub: string; tone: 'emerald'|'sky'|'violet'|'amber' }) {
  const colors = { emerald: 'from-emerald-500/25 to-emerald-500/5 border-emerald-400/30', sky: 'from-sky-500/25 to-sky-500/5 border-sky-400/30', violet: 'from-violet-500/25 to-violet-500/5 border-violet-400/30', amber: 'from-amber-500/25 to-amber-500/5 border-amber-400/30' }[tone];
  return <div className={`rounded-2xl border bg-gradient-to-br ${colors} p-4`}><p className="text-slate-400 text-xs">{title}</p><p className="text-3xl font-bold mt-1">{value}</p><p className="text-xs text-slate-500 mt-1">{sub}</p></div>;
}
function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-white/10 bg-white/[0.04] p-5 ${className}`}><h2 className="text-lg font-semibold mb-4">{title}</h2>{children}</section>;
}
function Status({ label, ok }: { label: string; ok: boolean }) {
  return <div className={`rounded-xl border p-3 ${ok ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' : 'border-amber-400/30 bg-amber-400/10 text-amber-100'}`}><div className="text-xl">{ok ? '✅' : '⚠️'}</div><div className="text-xs mt-1">{label}</div></div>;
}
function List({ items }: { items: {name:string; value:number}[] }) {
  return <div className="space-y-2 text-sm">{items.length ? items.slice(0, 6).map(x => <div key={x.name} className="flex justify-between gap-4 border-b border-white/10 pb-2"><span className="break-all">{x.name}</span><b>{x.value}</b></div>) : <p className="text-slate-400">暂无数据</p>}</div>;
}
