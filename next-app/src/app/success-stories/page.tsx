'use client';

import { useEffect, useMemo, useState } from 'react';
import TabBar from '../TabBar';
import { IS_CN } from '@/lib/deploy';

type RegionKey = 'cn' | 'global';
type SceneItem = {
  sourceType: 'product-tag' | 'seo-trend';
  kind: 'product' | 'trend';
  region: RegionKey;
  keyword: string;
  tag: string;
  title: string;
  desc: string;
  imageUrl?: string;
  imageUrlAbsolute?: string;
  route?: string;
  count?: number;
  score?: number;
  momentum?: string;
  visualPrompt?: string;
  sortOrder?: number;
  enabled?: boolean;
  managedId?: string;
  sceneId?: string;
  hasCustomCover?: boolean;
};
type RegionCatalog = { label: string; market: string; productTags: SceneItem[]; seoTrends: SceneItem[] };
type CatalogResp = { regions: Partial<Record<RegionKey, RegionCatalog>>; updatedAt?: string };

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const initialRegion: RegionKey = IS_CN ? 'cn' : 'global';

function imageOf(s: SceneItem) {
  return s.imageUrl || s.imageUrlAbsolute || '';
}
function sourceLabel(s: SceneItem) {
  return s.sourceType === 'product-tag' ? '商品标签场景' : 'SEO趋势词场景';
}
function regionLabel(r: RegionKey) {
  return r === 'cn' ? '国内版' : '国外版';
}

export default function SuccessStoriesPage() {
  const [region, setRegion] = useState<RegionKey>(initialRegion);
  const [catalog, setCatalog] = useState<CatalogResp>({ regions: {} });
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [msg, setMsg] = useState('');
  const [query, setQuery] = useState('');

  const load = async (nextRegion = region) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/scenes/catalog?region=${nextRegion}`, { cache: 'no-store' });
      const data = await res.json();
      setCatalog(data);
      setMsg('');
    } catch (e: any) {
      setMsg(`加载失败：${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(initialRegion); }, []);

  const current = catalog.regions?.[region];
  const productTags = useMemo(() => filterItems(current?.productTags || [], query), [current, query]);
  const seoTrends = useMemo(() => filterItems(current?.seoTrends || [], query), [current, query]);
  const totalCount = (current?.productTags?.length || 0) + (current?.seoTrends?.length || 0);

  function filterItems(items: SceneItem[], q: string) {
    const k = q.trim().toLowerCase();
    if (!k) return items;
    return items.filter(x => [x.keyword, x.title, x.desc, x.tag].join(' ').toLowerCase().includes(k));
  }

  async function saveCover(scene: SceneItem, file?: File) {
    if (!file) return;
    const key = `${scene.kind}:${scene.region}:${scene.keyword}`;
    setSavingKey(key);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('region', scene.region);
      fd.append('kind', scene.kind);
      fd.append('keyword', scene.keyword);
      fd.append('tag', scene.tag || scene.keyword);
      fd.append('title', scene.title || scene.keyword);
      fd.append('desc', scene.desc || '');
      fd.append('sortOrder', String(scene.sortOrder || 0));
      fd.append('enabled', String(scene.enabled !== false));
      fd.append('image', file);
      const url = scene.managedId ? `${API}/scenes/${scene.managedId}` : `${API}/scenes`;
      const method = scene.managedId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detail || String(res.status));
      setMsg(`✅ 已更新「${scene.keyword}」封面`);
      await load(region);
    } catch (e: any) {
      setMsg(`❌ 更新封面失败：${e.message || e}`);
    } finally {
      setSavingKey('');
    }
  }

  async function saveText(scene: SceneItem, patch: Partial<SceneItem>) {
    const key = `${scene.kind}:${scene.region}:${scene.keyword}:text`;
    setSavingKey(key);
    setMsg('');
    try {
      const fd = new FormData();
      const merged = { ...scene, ...patch };
      fd.append('region', merged.region);
      fd.append('kind', merged.kind);
      fd.append('keyword', merged.keyword);
      fd.append('tag', merged.tag || merged.keyword);
      fd.append('title', merged.title || merged.keyword);
      fd.append('desc', merged.desc || '');
      fd.append('sortOrder', String(merged.sortOrder || 0));
      fd.append('enabled', String(merged.enabled !== false));
      const url = scene.managedId ? `${API}/scenes/${scene.managedId}` : `${API}/scenes`;
      const method = scene.managedId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detail || String(res.status));
      setMsg(`✅ 已保存「${scene.keyword}」文字`);
      await load(region);
    } catch (e: any) {
      setMsg(`❌ 保存失败：${e.message || e}`);
    } finally {
      setSavingKey('');
    }
  }

  const headerBg = region === 'cn'
    ? 'from-emerald-950 via-green-900 to-stone-950'
    : 'from-slate-950 via-indigo-950 to-emerald-950';

  return (
    <main className="min-h-screen bg-stone-950 text-white pb-20">
      <section className={`bg-gradient-to-br ${headerBg} px-5 pt-8 pb-8 border-b border-white/10`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
            <div>
              <a href="/" className="text-sm text-emerald-200">← 返回首页</a>
              <h1 className="text-3xl md:text-5xl font-black mt-4 tracking-tight">庭院园林 · 成功案例</h1>
              <p className="text-sm md:text-base text-emerald-50/75 mt-3 max-w-2xl leading-relaxed">
                单独管理全部成功案例：左边来自商品标签，右边来自SEO趋势词；每个场景都能独立替换封面，并按国内版 / 国外版分别展示。
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-4 min-w-[220px]">
              <div className="text-xs text-white/60">当前页面</div>
              <div className="text-2xl font-bold mt-1">{regionLabel(region)}</div>
              <div className="text-xs text-white/60 mt-1">共 {totalCount} 个场景</div>
              {catalog.updatedAt && <div className="text-[11px] text-white/40 mt-2">更新：{new Date(catalog.updatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</div>}
            </div>
          </div>

          <div className="mt-6 flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <div className="inline-flex rounded-2xl border border-white/10 bg-black/20 p-1">
              {(['cn', 'global'] as RegionKey[]).map(r => (
                <button key={r} onClick={() => { setRegion(r); load(r); }} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${region === r ? 'bg-white text-stone-950' : 'text-white/70 hover:text-white'}`}>
                  {r === 'cn' ? '国内版展示' : '国外版展示'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索标签/趋势词/标题" className="w-full md:w-72 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm outline-none placeholder:text-white/40" />
              <button onClick={() => load(region)} className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-400">刷新</button>
            </div>
          </div>

          {msg && <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${msg.startsWith('✅') ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : 'border-rose-300/30 bg-rose-300/10 text-rose-100'}`}>{msg}</div>}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-5 py-8 space-y-10">
        {loading ? (
          <div className="py-24 text-center text-white/50">正在加载成功案例场景...</div>
        ) : (
          <>
            <SceneSection
              title="商品标签场景"
              subtitle={`来自商品库 category/sceneTags，按 ${regionLabel(region)} 生成园林应用场景。`}
              items={productTags}
              savingKey={savingKey}
              onCover={saveCover}
              onText={saveText}
            />
            <SceneSection
              title="SEO趋势词场景"
              subtitle={`来自 /seo 的${region === 'cn' ? '国内' : '国外'}趋势词，每个词可单独配落地页封面。`}
              items={seoTrends}
              savingKey={savingKey}
              onCover={saveCover}
              onText={saveText}
            />
          </>
        )}
      </div>
      <TabBar />
    </main>
  );
}

function SceneSection({ title, subtitle, items, savingKey, onCover, onText }: {
  title: string;
  subtitle: string;
  items: SceneItem[];
  savingKey: string;
  onCover: (scene: SceneItem, file?: File) => void;
  onText: (scene: SceneItem, patch: Partial<SceneItem>) => void;
}) {
  return (
    <section>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-5">
        <div>
          <p className="text-xs text-emerald-300 font-bold tracking-[0.3em] uppercase">{title === '商品标签场景' ? 'Product Tags' : 'SEO Trends'}</p>
          <h2 className="text-2xl md:text-3xl font-black mt-1">{title}</h2>
          <p className="text-sm text-white/45 mt-2">{subtitle}</p>
        </div>
        <div className="text-sm text-white/50">{items.length} 个场景</div>
      </div>
      {items.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map(scene => <SceneCard key={`${scene.kind}-${scene.region}-${scene.keyword}`} scene={scene} savingKey={savingKey} onCover={onCover} onText={onText} />)}
        </div>
      ) : <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center text-white/45">暂无匹配场景。</div>}
    </section>
  );
}

function SceneCard({ scene, savingKey, onCover, onText }: {
  scene: SceneItem;
  savingKey: string;
  onCover: (scene: SceneItem, file?: File) => void;
  onText: (scene: SceneItem, patch: Partial<SceneItem>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(scene.title);
  const [desc, setDesc] = useState(scene.desc);
  const [tag, setTag] = useState(scene.tag);
  useEffect(() => { setTitle(scene.title); setDesc(scene.desc); setTag(scene.tag); }, [scene.title, scene.desc, scene.tag]);
  const key = `${scene.kind}:${scene.region}:${scene.keyword}`;
  const busy = savingKey === key || savingKey === `${key}:text`;
  const img = imageOf(scene);

  return (
    <article className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] shadow-2xl shadow-black/20">
      <div className="relative h-56 bg-gradient-to-br from-emerald-950 to-stone-900">
        {img ? <img src={img} alt={scene.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-7xl opacity-30">🌿</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold text-white backdrop-blur">{regionLabel(scene.region)}</span>
          <span className="rounded-full bg-emerald-500/85 px-3 py-1 text-[11px] font-bold text-white">{sourceLabel(scene)}</span>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-stone-950">{scene.tag || scene.keyword}</span>
            {scene.hasCustomCover && <span className="rounded-full bg-emerald-300/90 px-2.5 py-1 text-[10px] font-black text-emerald-950">自定义封面</span>}
          </div>
          <h3 className="line-clamp-2 text-lg font-black leading-tight text-white">{scene.title}</h3>
        </div>
      </div>
      <div className="space-y-4 p-4">
        <p className="line-clamp-3 min-h-[3.8rem] text-sm leading-relaxed text-white/58">{scene.desc}</p>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/45">
          <span>关键词：{scene.keyword}</span>
          {typeof scene.count === 'number' && <span>· 数量/热度：{scene.count}</span>}
          {scene.momentum && <span>· {scene.momentum}</span>}
        </div>

        {editing && (
          <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm outline-none" placeholder="场景标题" />
            <input value={tag} onChange={e => setTag(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm outline-none" placeholder="标签" />
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm outline-none" placeholder="场景描述" />
            <button disabled={busy} onClick={() => onText(scene, { title, desc, tag })} className="w-full rounded-xl bg-white px-3 py-2 text-sm font-bold text-stone-950 disabled:opacity-50">保存文字</button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <label className={`cursor-pointer rounded-2xl px-3 py-2 text-center text-sm font-bold ${busy ? 'bg-white/10 text-white/40' : 'bg-emerald-500 text-white hover:bg-emerald-400'}`}>
            {busy ? '保存中...' : '修改封面'}
            <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={e => onCover(scene, e.target.files?.[0])} />
          </label>
          <button onClick={() => setEditing(v => !v)} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white hover:bg-white/10">
            {editing ? '收起编辑' : '编辑文字'}
          </button>
        </div>
        {scene.route && <a href={scene.route} className="block rounded-2xl border border-white/10 px-3 py-2 text-center text-xs font-bold text-emerald-200 hover:bg-white/10">打开关联落地页 →</a>}
      </div>
    </article>
  );
}
