'use client';

import { useEffect, useMemo, useState } from 'react';
import TabBar from '../TabBar';
import AuthMenuButton from '../components/AuthMenuButton';
import { IS_CN } from '@/lib/deploy';
import { useAuth } from '@/lib/auth-context';
import { getToken } from '@/lib/api';

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
  titleEn?: string;
  descEn?: string;
  tagEn?: string;
  sortOrder?: number;
  enabled?: boolean;
  managedId?: string;
  sceneId?: string;
  hasCustomCover?: boolean;
};
type RegionCatalog = { label: string; market: string; productTags: SceneItem[]; seoTrends: SceneItem[] };
type CatalogResp = { regions: Partial<Record<RegionKey, RegionCatalog>>; updatedAt?: string };
type CoverOption = { url: string; productId?: string; title: string; category?: string };

type LangKey =
  | 'backHome' | 'title' | 'intro' | 'currentPage' | 'sceneCount' | 'adminMode' | 'visitorMode'
  | 'adminCanEdit' | 'visitorOnly' | 'fixedRegionNote' | 'searchPlaceholder' | 'refresh'
  | 'loading' | 'allScenesLabel' | 'allScenesTitle' | 'allScenesDesc' | 'scenesUnit'
  | 'empty' | 'sceneCase' | 'customCover' | 'keyword' | 'countHeat' | 'titlePlaceholder'
  | 'tagPlaceholder' | 'descPlaceholder' | 'saveText' | 'saving' | 'chooseLibrary'
  | 'collapseEdit' | 'editText' | 'chooseCoverTitle' | 'loadingImages' | 'noImages'
  | 'openLanding' | 'loadFailed' | 'coverSaved' | 'coverFailed' | 'textSaved' | 'textFailed';
const I18N: Record<RegionKey, Record<LangKey, string>> = {
  cn: {
    backHome: '← 返回首页',
    title: '庭院园林 · 成功案例',
    intro: '所有场景统一展示：商品标签与趋势应用全部合并到一个列表，访客只看案例，管理员登录后可修改封面与文字。',
    currentPage: '当前页面',
    sceneCount: '共 {count} 个场景',
    adminMode: '管理员模式：可修改封面',
    visitorMode: '普通用户：仅可浏览',
    adminCanEdit: '管理员模式：可修改封面',
    visitorOnly: '普通用户：仅可浏览',
    fixedRegionNote: '此站固定展示国内版成功案例',
    searchPlaceholder: '搜索场景/标签/标题',
    refresh: '刷新',
    loading: '正在加载成功案例场景...',
    allScenesLabel: 'All Scenes',
    allScenesTitle: '所有场景',
    allScenesDesc: '统一浏览庭院园林案例，减少分类切换成本。',
    scenesUnit: '{count} 个场景',
    empty: '暂无匹配场景。',
    sceneCase: '场景案例',
    customCover: '自定义封面',
    keyword: '关键词：{keyword}',
    countHeat: '· 数量/热度：{count}',
    titlePlaceholder: '场景标题',
    tagPlaceholder: '标签',
    descPlaceholder: '场景描述',
    saveText: '保存文字',
    saving: '保存中...',
    chooseLibrary: '选择商品库图片',
    collapseEdit: '收起编辑',
    editText: '编辑文字',
    chooseCoverTitle: '选择商品库图片作为封面',
    loadingImages: '正在加载商品图片...',
    noImages: '商品库暂未找到可用图片。',
    openLanding: '打开关联落地页 →',
    loadFailed: '加载失败：{message}',
    coverSaved: '✅ 已从商品库更新「{keyword}」封面',
    coverFailed: '❌ 更新封面失败：{message}',
    textSaved: '✅ 已保存「{keyword}」文字',
    textFailed: '❌ 保存失败：{message}',
  },
  global: {
    backHome: '← Back to Home',
    title: 'Garden & Landscape · Success Stories',
    intro: 'Explore curated landscape scenes built from product tags and SEO trend opportunities. Visitors browse the cases; signed-in administrators can update covers and copy.',
    currentPage: 'Current page',
    sceneCount: '{count} scenes',
    adminMode: 'Admin mode: cover editing enabled',
    visitorMode: 'Visitor mode: browsing only',
    adminCanEdit: 'Admin mode: cover editing enabled',
    visitorOnly: 'Visitor mode: browsing only',
    fixedRegionNote: 'This site always shows the international success stories.',
    searchPlaceholder: 'Search scenes, tags, or titles',
    refresh: 'Refresh',
    loading: 'Loading success story scenes...',
    allScenesLabel: 'All Scenes',
    allScenesTitle: 'All Success Story Scenes',
    allScenesDesc: 'Browse international garden and landscape cases without switching regions manually.',
    scenesUnit: '{count} scenes',
    empty: 'No matching scenes yet.',
    sceneCase: 'Success Story',
    customCover: 'Custom Cover',
    keyword: 'Keyword: {keyword}',
    countHeat: '· Volume / heat: {count}',
    titlePlaceholder: 'Scene title',
    tagPlaceholder: 'Tag',
    descPlaceholder: 'Scene description',
    saveText: 'Save copy',
    saving: 'Saving...',
    chooseLibrary: 'Choose product-library image',
    collapseEdit: 'Collapse editor',
    editText: 'Edit copy',
    chooseCoverTitle: 'Choose a product-library image as cover',
    loadingImages: 'Loading product images...',
    noImages: 'No available image found in the product library.',
    openLanding: 'Open landing page →',
    loadFailed: 'Load failed: {message}',
    coverSaved: '✅ Updated cover for “{keyword}” from product library',
    coverFailed: '❌ Cover update failed: {message}',
    textSaved: '✅ Saved copy for “{keyword}”',
    textFailed: '❌ Save failed: {message}',
  },
};
function tr(region: RegionKey, key: LangKey, vars: Record<string, string | number> = {}) {
  let text = I18N[region][key];
  for (const [k, v] of Object.entries(vars)) text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  return text;
}

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
function getInitialRegion(): RegionKey {
  if (typeof window !== 'undefined' && window.location.hostname.includes('horiculture.space')) return 'global';
  return IS_CN ? 'cn' : 'global';
}
const initialRegion: RegionKey = IS_CN ? 'cn' : 'global';

function imageOf(s: SceneItem) {
  return s.imageUrl || s.imageUrlAbsolute || '';
}
function regionLabel(r: RegionKey) {
  return r === 'cn' ? '国内版' : '国际版';
}
function sceneTitle(scene: SceneItem, uiRegion: RegionKey) {
  return uiRegion === 'global' ? (scene.titleEn || scene.title || scene.keyword) : scene.title;
}
function sceneDesc(scene: SceneItem, uiRegion: RegionKey) {
  return uiRegion === 'global' ? (scene.descEn || scene.desc) : scene.desc;
}
function sceneTag(scene: SceneItem, uiRegion: RegionKey) {
  return uiRegion === 'global' ? (scene.tagEn || scene.tag || scene.keyword) : (scene.tag || scene.keyword);
}
function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export default function SuccessStoriesPage() {
  const { user } = useAuth();
  const isAdmin = !!(user?.isAdmin || user?.isSuperAdmin || user?.role === 'admin' || user?.role === 'super_admin');
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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setMsg(tr(nextRegion, 'loadFailed', { message }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const detected = getInitialRegion();
    setRegion(detected);
    load(detected);
  }, []);

  const current = catalog.regions?.[region];
  const allScenes = useMemo(() => {
    const merged = [...(current?.productTags || []), ...(current?.seoTrends || [])]
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const k = query.trim().toLowerCase();
    if (!k) return merged;
    return merged.filter(x => [x.keyword, x.title, x.desc, x.tag].join(' ').toLowerCase().includes(k));
  }, [current, query]);
  const totalCount = (current?.productTags?.length || 0) + (current?.seoTrends?.length || 0);
  const t = (key: LangKey, vars?: Record<string, string | number>) => tr(region, key, vars);

  async function saveCoverFromLibrary(scene: SceneItem, coverImageUrl: string) {
    if (!coverImageUrl || !isAdmin) return;
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
      fd.append('coverImageUrl', coverImageUrl);
      const url = scene.managedId ? `${API}/scenes/${scene.managedId}` : `${API}/scenes`;
      const method = scene.managedId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, body: fd, headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detail || String(res.status));
      setMsg(tr(region, 'coverSaved', { keyword: scene.keyword }));
      await load(region);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setMsg(tr(region, 'coverFailed', { message }));
    } finally {
      setSavingKey('');
    }
  }

  async function saveText(scene: SceneItem, patch: Partial<SceneItem>) {
    if (!isAdmin) return;
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
      if (merged.titleEn) fd.append('titleEn', merged.titleEn);
      if (merged.descEn) fd.append('descEn', merged.descEn);
      if (merged.tagEn) fd.append('tagEn', merged.tagEn);
      fd.append('sortOrder', String(merged.sortOrder || 0));
      fd.append('enabled', String(merged.enabled !== false));
      const url = scene.managedId ? `${API}/scenes/${scene.managedId}` : `${API}/scenes`;
      const method = scene.managedId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, body: fd, headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detail || String(res.status));
      setMsg(tr(region, 'textSaved', { keyword: scene.keyword }));
      await load(region);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setMsg(tr(region, 'textFailed', { message }));
    } finally {
      setSavingKey('');
    }
  }

  const headerBg = region === 'cn'
    ? 'from-emerald-950 via-green-900 to-stone-950'
    : 'from-slate-950 via-indigo-950 to-emerald-950';

  return (
    <main data-fixed-success-region={region} className="min-h-screen bg-stone-950 text-white pb-20">
      <section className={`bg-gradient-to-br ${headerBg} px-5 pt-8 pb-8 border-b border-white/10`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
            <div>
              <a href="/" className="text-sm text-emerald-200">{t('backHome')}</a>
              <h1 className="text-3xl md:text-5xl font-black mt-4 tracking-tight">{t('title')}</h1>
              <p className="text-sm md:text-base text-emerald-50/75 mt-3 max-w-2xl leading-relaxed">
                {t('intro')}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-4 min-w-[260px]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-white/60">{t('currentPage')}</div>
                  <div className="text-2xl font-bold mt-1">{regionLabel(region)}</div>
                  <div className="text-xs text-white/60 mt-1">{t('sceneCount', { count: totalCount })}</div>
                  <div className="text-[11px] text-white/55 mt-2">{isAdmin ? t('adminMode') : t('visitorMode')}</div>
                </div>
                <AuthMenuButton dark loginRedirect="/success-stories" />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-bold text-white/80">
              {regionLabel(region)} · {t('fixedRegionNote')}
            </div>
            <div className="flex gap-2">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('searchPlaceholder')} className="w-full md:w-72 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm outline-none placeholder:text-white/40" />
              <button onClick={() => load(region)} className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-400">{t('refresh')}</button>
            </div>
          </div>

          {msg && <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${msg.startsWith('✅') ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : 'border-rose-300/30 bg-rose-300/10 text-rose-100'}`}>{msg}</div>}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-5 py-8">
        {loading ? (
          <div className="py-24 text-center text-white/50">{t('loading')}</div>
        ) : (
          <section>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-5">
              <div>
                <p className="text-xs text-emerald-300 font-bold tracking-[0.3em] uppercase">All Scenes</p>
                <h2 className="text-2xl md:text-3xl font-black mt-1">{t('allScenesTitle')}</h2>
                <p className="text-sm text-white/45 mt-2">{t('allScenesDesc')}</p>
              </div>
              <div className="text-sm text-white/50">{t('scenesUnit', { count: allScenes.length })}</div>
            </div>
            {allScenes.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {allScenes.map(scene => <SceneCard key={`${scene.kind}-${scene.region}-${scene.keyword}`} scene={scene} uiRegion={region} savingKey={savingKey} isAdmin={isAdmin} onCoverFromLibrary={saveCoverFromLibrary} onText={saveText} />)}
              </div>
            ) : <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center text-white/45">{t('empty')}</div>}
          </section>
        )}
      </div>
      <TabBar />
    </main>
  );
}

function SceneCard({ scene, uiRegion, savingKey, isAdmin, onCoverFromLibrary, onText }: {
  scene: SceneItem;
  uiRegion: RegionKey;
  savingKey: string;
  isAdmin: boolean;
  onCoverFromLibrary: (scene: SceneItem, coverImageUrl: string) => void;
  onText: (scene: SceneItem, patch: Partial<SceneItem>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(sceneTitle(scene, uiRegion));
  const [desc, setDesc] = useState(sceneDesc(scene, uiRegion));
  const [tag, setTag] = useState(sceneTag(scene, uiRegion));
  const [pickingCover, setPickingCover] = useState(false);
  const [coverOptions, setCoverOptions] = useState<CoverOption[]>([]);
  const [coverLoading, setCoverLoading] = useState(false);
  useEffect(() => { setTitle(sceneTitle(scene, uiRegion)); setDesc(sceneDesc(scene, uiRegion)); setTag(sceneTag(scene, uiRegion)); }, [scene.title, scene.desc, scene.tag, scene.titleEn, scene.descEn, scene.tagEn, uiRegion]);
  const key = `${scene.kind}:${scene.region}:${scene.keyword}`;
  const busy = savingKey === key || savingKey === `${key}:text`;
  const img = imageOf(scene);
  const tc = (label: LangKey, vars?: Record<string, string | number>) => tr(uiRegion, label, vars);
  async function loadCoverOptions() {
    setPickingCover(v => !v);
    if (coverOptions.length) return;
    setCoverLoading(true);
    try {
      const qs = new URLSearchParams({ keyword: scene.keyword || scene.tag || '', category: scene.kind === 'product' ? scene.keyword : '', limit: '80' });
      const res = await fetch(`${API}/scenes/cover-images?${qs.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      setCoverOptions(Array.isArray(data.images) ? data.images : []);
    } catch {
      setCoverOptions([]);
    } finally {
      setCoverLoading(false);
    }
  }

  return (
    <article className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] shadow-2xl shadow-black/20">
      <div className="relative h-56 bg-gradient-to-br from-emerald-950 to-stone-900">
        {img ? <img src={img} alt={sceneTitle(scene, uiRegion)} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-7xl opacity-30">🌿</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold text-white backdrop-blur">{regionLabel(scene.region)}</span>
          <span className="rounded-full bg-emerald-500/85 px-3 py-1 text-[11px] font-bold text-white">{tc('sceneCase')}</span>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-stone-950">{sceneTag(scene, uiRegion)}</span>
            {scene.hasCustomCover && <span className="rounded-full bg-emerald-300/90 px-2.5 py-1 text-[10px] font-black text-emerald-950">{tc('customCover')}</span>}
          </div>
          <h3 className="line-clamp-2 text-lg font-black leading-tight text-white">{sceneTitle(scene, uiRegion)}</h3>
        </div>
      </div>
      <div className="space-y-4 p-4">
        <p className="line-clamp-3 min-h-[3.8rem] text-sm leading-relaxed text-white/58">{sceneDesc(scene, uiRegion)}</p>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/45">
          <span>{tc('keyword', { keyword: scene.keyword })}</span>
          {typeof scene.count === 'number' && <span>{tc('countHeat', { count: scene.count })}</span>}
          {scene.momentum && <span>· {scene.momentum}</span>}
        </div>

        {isAdmin && editing && (
          <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm outline-none" placeholder={tc('titlePlaceholder')} />
            <input value={tag} onChange={e => setTag(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm outline-none" placeholder={tc('tagPlaceholder')} />
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm outline-none" placeholder={tc('descPlaceholder')} />
            <button disabled={busy} onClick={() => onText(scene, uiRegion === 'global' ? { titleEn: title, descEn: desc, tagEn: tag } : { title, desc, tag })} className="w-full rounded-xl bg-white px-3 py-2 text-sm font-bold text-stone-950 disabled:opacity-50">{tc('saveText')}</button>
          </div>
        )}

        {isAdmin && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button disabled={busy} onClick={loadCoverOptions} className={`rounded-2xl px-3 py-2 text-center text-sm font-bold ${busy ? 'bg-white/10 text-white/40' : 'bg-emerald-500 text-white hover:bg-emerald-400'}`}>
                {busy ? tc('saving') : tc('chooseLibrary')}
              </button>
              <button onClick={() => setEditing(v => !v)} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white hover:bg-white/10">
                {editing ? tc('collapseEdit') : tc('editText')}
              </button>
            </div>
            {pickingCover && (
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <div className="mb-2 text-xs font-bold text-white/70">{tc('chooseCoverTitle')}</div>
                {coverLoading ? <div className="py-6 text-center text-xs text-white/45">{tc('loadingImages')}</div> : (
                  coverOptions.length ? <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto">
                    {coverOptions.map((opt, i) => (
                      <button key={`${opt.url}-${i}`} type="button" disabled={busy} onClick={() => onCoverFromLibrary(scene, opt.url)} className="group overflow-hidden rounded-xl border border-white/10 bg-white/5 text-left hover:border-emerald-300/70">
                        <img src={opt.url} alt={opt.title} className="h-20 w-full object-cover" loading="lazy" />
                        <div className="p-1.5 text-[10px] leading-tight text-white/60 line-clamp-2">{opt.title}</div>
                      </button>
                    ))}
                  </div> : <div className="py-6 text-center text-xs text-white/45">{tc('noImages')}</div>
                )}
              </div>
            )}
          </>
        )}
        {scene.route && <a href={scene.route} className="block rounded-2xl border border-white/10 px-3 py-2 text-center text-xs font-bold text-emerald-200 hover:bg-white/10">{tc('openLanding')}</a>}
      </div>
    </article>
  );
}
