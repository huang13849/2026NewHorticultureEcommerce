import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SEO Dashboard | 植物猎人 Plant Hunter',
  description: 'SEO health, keyword ranking snapshot and traffic analytics for horiculture.club and Pages fallback domain.',
  alternates: { canonical: '/seo' },
  robots: { index: false, follow: false },
};

const SEO_API = process.env.NEXT_PUBLIC_SEO_API_URL || 'http://100.76.15.64:3011';
const PRIMARY_DOMAIN = 'horiculture.club';

type Audit = {
  score: number;
  target: string;
  host: string;
  title: string;
  description: string;
  canonical: string;
  jsonLdCount: number;
  h1Count: number;
  imgWithoutAlt: number;
  hasBrand?: boolean;
  robots: { ok: boolean; status: number };
  sitemap: { ok: boolean; status: number };
  recommendations: string[];
};
type RankingMatch = { domain: string; rank: number | null; found: boolean };
type Ranking = { keyword: string; engine: string; matches?: RankingMatch[]; rank?: number | null; found: boolean; error?: string };
type Analytics = {
  pageviews: number;
  estimatedVisitors: number;
  byDay: Record<string, number>;
  byHost?: Record<string, number>;
  topHosts?: {name:string; value:number}[];
  topPages: {name:string; value:number}[];
  topReferrers: {name:string; value:number}[];
  note: string;
};

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${SEO_API}${path}`, { next: { revalidate: 300 } });
    if (!res.ok) return fallback;
    return res.json();
  } catch { return fallback; }
}

export default async function SeoDashboardPage() {
  const [auditAll, rankingData, analytics] = await Promise.all([
    getJson<{primary: string; sites: Audit[]}>('/api/seo/audit-all', { primary: 'https://horiculture.club', sites: [] }),
    getJson<{results: Ranking[]; note: string}>('/api/seo/rankings', { results: [], note: '' }),
    getJson<Analytics>('/api/analytics/summary?days=30', { pageviews: 0, estimatedVisitors: 0, byDay: {}, topHosts: [], topPages: [], topReferrers: [], note: '' }),
  ]);

  const audits = auditAll.sites || [];
  const primaryAudit = audits.find(a => a.host === PRIMARY_DOMAIN) || audits[0] || { score: 0, target: 'https://horiculture.club', host: PRIMARY_DOMAIN, title: '', description: '', canonical: '', jsonLdCount: 0, h1Count: 0, imgWithoutAlt: 0, hasBrand: false, robots: { ok: false, status: 0 }, sitemap: { ok: false, status: 0 }, recommendations: ['SEO service 暂时不可达'] };
  const days = Object.entries(analytics.byDay || {}).sort(([a],[b]) => a.localeCompare(b)).slice(-14);
  const maxPv = Math.max(1, ...days.map(([,v]) => v));
  const rankedCount = (rankingData.results || []).filter(r => (r.matches || []).some(m => m.found) || r.found).length;

  return (
    <main className="min-h-screen bg-slate-950 text-white px-5 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <a href="/" className="text-emerald-300 text-sm">← 返回首页</a>
            <h1 className="text-3xl md:text-5xl font-bold mt-3">SEO 排名与访问看板</h1>
            <p className="text-slate-400 mt-2">主域名：horiculture.club；备用域名：2026newhorticultureecommerce.pages.dev</p>
          </div>
          <a href={`${SEO_API}/api/health`} className="rounded-xl border border-emerald-400/40 px-4 py-2 text-emerald-200 text-sm">SEO Service API</a>
        </header>

        <section className="grid md:grid-cols-4 gap-4">
          <Metric title="主域 SEO 健康分" value={`${primaryAudit.score || 0}/100`} tone="emerald" />
          <Metric title="近30天 PV" value={String(analytics.pageviews || 0)} tone="sky" />
          <Metric title="估算访客人数" value={String(analytics.estimatedVisitors || 0)} tone="violet" />
          <Metric title="关键词已进前20" value={String(rankedCount)} tone="amber" />
        </section>

        <section className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6 text-sm text-emerald-50">
          <b>判断：</b>“植物猎人 / Plant Hunter”作为品牌词有帮助，容易先拿到品牌搜索排名；两个域名同时存在时，最好让 <b>horiculture.club</b> 做 canonical/主域，Pages 域名做备用或 301 跳转，避免权重分散。
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          {audits.length ? audits.map((audit) => (
            <Card key={audit.host} title={`${audit.host}${audit.host === PRIMARY_DOMAIN ? ' · 主域' : ' · 备用域'}`}>
              <div className="space-y-3 text-sm">
                <Row k="SEO 分" v={`${audit.score || 0}/100`} />
                <Row k="Title" v={audit.title || '-'} />
                <Row k="Description" v={audit.description || '-'} />
                <Row k="Canonical" v={audit.canonical || '-'} />
                <Row k="品牌词" v={audit.hasBrand ? '✅ 含植物猎人/Plant Hunter' : '❌ 未检测到'} />
                <Row k="JSON-LD" v={`${audit.jsonLdCount || 0} 个`} />
                <Row k="H1" v={`${audit.h1Count || 0} 个`} />
                <Row k="robots.txt" v={audit.robots?.ok ? '✅ 可访问' : `❌ ${audit.robots?.status || ''}`} />
                <Row k="sitemap.xml" v={audit.sitemap?.ok ? '✅ 可访问' : `❌ ${audit.sitemap?.status || ''}`} />
              </div>
              {audit.recommendations?.length ? <ul className="space-y-1 text-xs text-amber-200 list-disc pl-5 mt-4">{audit.recommendations.map((x, i) => <li key={i}>{x}</li>)}</ul> : null}
            </Card>
          )) : <Card title="SEO 基础体检"><p className="text-slate-400">SEO service 暂时不可达</p></Card>}
        </section>

        <section className="grid lg:grid-cols-3 gap-6">
          <Card title="搜索排名快照（Bing 前20）" className="lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400"><tr><th className="text-left py-2">关键词</th><th className="text-left">引擎</th><th className="text-right">horiculture.club</th><th className="text-right">pages.dev</th></tr></thead>
                <tbody>
                  {(rankingData.results || []).map((r) => {
                    const matches = r.matches || [];
                    const primary = matches.find(m => m.domain === 'horiculture.club');
                    const pages = matches.find(m => m.domain.includes('pages.dev'));
                    return (
                      <tr key={r.keyword} className="border-t border-white/10">
                        <td className="py-2 pr-3">{r.keyword}</td>
                        <td className="text-slate-400">{r.engine}{r.error ? ` · ${r.error}` : ''}</td>
                        <td className="text-right font-semibold">{primary?.rank ? `#${primary.rank}` : '未进前20'}</td>
                        <td className="text-right font-semibold">{pages?.rank ? `#${pages.rank}` : '未进前20'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">{rankingData.note}</p>
          </Card>

          <Card title="访问趋势（近14天）">
            <div className="space-y-2">
              {days.length ? days.map(([d, v]) => (
                <div key={d}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1"><span>{d.slice(5)}</span><span>{v}</span></div>
                  <div className="h-2 rounded bg-white/10"><div className="h-2 rounded bg-emerald-400" style={{ width: `${Math.max(4, v / maxPv * 100)}%` }} /></div>
                </div>
              )) : <p className="text-slate-400 text-sm">暂无访问数据。公开站点要能统计，需要把 SEO API 以 HTTPS 公网域名暴露，或接 Cloudflare Analytics API。</p>}
            </div>
          </Card>
        </section>

        <section className="grid lg:grid-cols-3 gap-6">
          <Card title="按域名访问">
            <List items={analytics.topHosts || []} />
          </Card>
          <Card title="热门页面">
            <List items={analytics.topPages || []} />
          </Card>
          <Card title="访问来源">
            <List items={analytics.topReferrers || []} />
          </Card>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm text-slate-300">
          <b className="text-white">访问人数说明：</b> 当前看板已经支持显示 PV、估算访客人数、按域名访问、热门页面和来源；但线上访客能不能被记录，取决于浏览器能否访问埋点接口。若部署在 Cloudflare Pages 上，建议后续接 Cloudflare Analytics API，或给 seo-service 配一个 HTTPS 公网入口。
        </section>
      </div>
    </main>
  );
}

function Metric({ title, value, tone }: { title: string; value: string; tone: 'emerald'|'sky'|'violet'|'amber' }) {
  const colors = { emerald: 'from-emerald-500/25 to-emerald-500/5 border-emerald-400/30', sky: 'from-sky-500/25 to-sky-500/5 border-sky-400/30', violet: 'from-violet-500/25 to-violet-500/5 border-violet-400/30', amber: 'from-amber-500/25 to-amber-500/5 border-amber-400/30' }[tone];
  return <div className={`rounded-3xl border bg-gradient-to-br ${colors} p-5`}><p className="text-slate-400 text-sm">{title}</p><p className="text-3xl font-bold mt-2">{value}</p></div>;
}
function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-white/10 bg-white/[0.04] p-6 ${className}`}><h2 className="text-xl font-semibold mb-4">{title}</h2>{children}</section>;
}
function Row({ k, v }: { k: string; v: string }) { return <div className="grid grid-cols-[110px_1fr] gap-3 border-b border-white/10 pb-2"><span className="text-slate-400">{k}</span><span className="break-all">{v}</span></div>; }
function List({ items }: { items: {name:string; value:number}[] }) {
  return <div className="space-y-2 text-sm">{items.length ? items.map(x => <div key={x.name} className="flex justify-between gap-4 border-b border-white/10 pb-2"><span className="break-all">{x.name}</span><b>{x.value}</b></div>) : <p className="text-slate-400">暂无数据</p>}</div>;
}
