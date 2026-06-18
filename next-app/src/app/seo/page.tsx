import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SEO Dashboard | Smart Flower Supply Chain',
  description: 'SEO health, keyword ranking snapshot and traffic analytics for 2026NewHorticultureEcommerce.',
  alternates: { canonical: '/seo' },
  robots: { index: false, follow: false },
};

const SEO_API = process.env.NEXT_PUBLIC_SEO_API_URL || 'http://100.76.15.64:3011';

type Audit = {
  score: number;
  title: string;
  description: string;
  canonical: string;
  jsonLdCount: number;
  h1Count: number;
  imgWithoutAlt: number;
  robots: { ok: boolean; status: number };
  sitemap: { ok: boolean; status: number };
  recommendations: string[];
};
type Ranking = { keyword: string; engine: string; rank: number | null; found: boolean; error?: string };
type Analytics = { pageviews: number; estimatedVisitors: number; byDay: Record<string, number>; topPages: {name:string; value:number}[]; topReferrers: {name:string; value:number}[]; note: string };

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${SEO_API}${path}`, { next: { revalidate: 300 } });
    if (!res.ok) return fallback;
    return res.json();
  } catch { return fallback; }
}

export default async function SeoDashboardPage() {
  const [audit, rankingData, analytics] = await Promise.all([
    getJson<Audit>('/api/seo/audit', { score: 0, title: '', description: '', canonical: '', jsonLdCount: 0, h1Count: 0, imgWithoutAlt: 0, robots: { ok: false, status: 0 }, sitemap: { ok: false, status: 0 }, recommendations: ['SEO service 暂时不可达'] }),
    getJson<{results: Ranking[]; note: string}>('/api/seo/rankings', { results: [], note: '' }),
    getJson<Analytics>('/api/analytics/summary?days=30', { pageviews: 0, estimatedVisitors: 0, byDay: {}, topPages: [], topReferrers: [], note: '' }),
  ]);

  const days = Object.entries(analytics.byDay || {}).sort(([a],[b]) => a.localeCompare(b)).slice(-14);
  const maxPv = Math.max(1, ...days.map(([,v]) => v));

  return (
    <main className="min-h-screen bg-slate-950 text-white px-5 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <a href="/" className="text-emerald-300 text-sm">← 返回首页</a>
            <h1 className="text-3xl md:text-5xl font-bold mt-3">SEO 排名与访问看板</h1>
            <p className="text-slate-400 mt-2">目标站：2026newhorticultureecommerce.pages.dev</p>
          </div>
          <a href={`${SEO_API}/api/health`} className="rounded-xl border border-emerald-400/40 px-4 py-2 text-emerald-200 text-sm">SEO Service API</a>
        </header>

        <section className="grid md:grid-cols-4 gap-4">
          <Metric title="SEO 健康分" value={`${audit.score || 0}/100`} tone="emerald" />
          <Metric title="近30天 PV" value={String(analytics.pageviews || 0)} tone="sky" />
          <Metric title="估算访客" value={String(analytics.estimatedVisitors || 0)} tone="violet" />
          <Metric title="关键词已进前20" value={String((rankingData.results || []).filter(r => r.found).length)} tone="amber" />
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <Card title="SEO 基础体检">
            <div className="space-y-3 text-sm">
              <Row k="Title" v={audit.title || '-'} />
              <Row k="Description" v={audit.description || '-'} />
              <Row k="Canonical" v={audit.canonical || '-'} />
              <Row k="JSON-LD" v={`${audit.jsonLdCount || 0} 个`} />
              <Row k="H1" v={`${audit.h1Count || 0} 个`} />
              <Row k="图片缺 alt" v={`${audit.imgWithoutAlt || 0} 张`} />
              <Row k="robots.txt" v={audit.robots?.ok ? '✅ 可访问' : `❌ ${audit.robots?.status || ''}`} />
              <Row k="sitemap.xml" v={audit.sitemap?.ok ? '✅ 可访问' : `❌ ${audit.sitemap?.status || ''}`} />
            </div>
          </Card>

          <Card title="优化建议">
            <ul className="space-y-2 text-sm text-slate-300 list-disc pl-5">
              {(audit.recommendations || []).length ? audit.recommendations.map((x, i) => <li key={i}>{x}</li>) : <li>基础项通过。下一步接 Search Console 看真实查询词。</li>}
            </ul>
          </Card>
        </section>

        <section className="grid lg:grid-cols-3 gap-6">
          <Card title="搜索排名快照（Bing 前20）" className="lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400"><tr><th className="text-left py-2">关键词</th><th className="text-left">引擎</th><th className="text-right">排名</th></tr></thead>
                <tbody>
                  {(rankingData.results || []).map((r) => (
                    <tr key={r.keyword} className="border-t border-white/10">
                      <td className="py-2 pr-3">{r.keyword}</td>
                      <td className="text-slate-400">{r.engine}{r.error ? ` · ${r.error}` : ''}</td>
                      <td className="text-right font-semibold">{r.rank ? `#${r.rank}` : '未进前20'}</td>
                    </tr>
                  ))}
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
              )) : <p className="text-slate-400 text-sm">暂无访问数据，上线埋点后开始累计。</p>}
            </div>
          </Card>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <Card title="热门页面">
            <List items={analytics.topPages || []} />
          </Card>
          <Card title="访问来源">
            <List items={analytics.topReferrers || []} />
          </Card>
        </section>

        <section className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6 text-sm text-emerald-50">
          <b>已做：</b> 新增 SEO 微服务、排名快照、访问埋点、robots/sitemap/结构化数据。<br />
          <b>下一步：</b> 到 Google Search Console / Bing Webmaster Tools 提交 sitemap；如果给 Cloudflare API Token，可把真实历史访问量也接进来看板。
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
