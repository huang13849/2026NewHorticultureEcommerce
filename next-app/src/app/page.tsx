'use client';

import { useState, useEffect } from 'react';
import { api, Product } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/context';
import { useRegion, type RegionCode } from '@/lib/region-context';
import TabBar from './TabBar';

const API = process.env.NEXT_PUBLIC_API_URL || "/api";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://horiculture.space';

function getImg(p: any): string {
  const raw = (p.images as string[])?.[0]
    || (p.panorama_images as string[])?.[0]
    || (p.detail_images as string[])?.[0]
    || (p.package_images as string[])?.[0]
    || (p.scene_images as string[])?.[0]
    || (p.root_soil_images as string[])?.[0]
    || '';
  if (!raw) return '';
  if (raw.startsWith('http')) return raw;
  return `/minio/supply-chain/${raw}`;
}
function hasImg(p: any): boolean { return !!getImg(p); }

function RegionalBackdrop({ code }: { code: RegionCode }) {
  const base = "absolute pointer-events-none select-none opacity-[0.16] md:opacity-[0.22]";
  if (code === 'cn') {
    return (
      <div className={`${base} right-[-20px] top-24 w-[360px] h-[280px] text-emerald-900`} aria-hidden>
        <svg viewBox="0 0 360 280" className="w-full h-full">
          <circle cx="180" cy="92" r="70" fill="none" stroke="currentColor" strokeWidth="10" />
          <circle cx="180" cy="92" r="42" fill="none" stroke="currentColor" strokeWidth="5" />
          <path d="M90 145H270L244 176H116Z" fill="currentColor" />
          <path d="M110 184H250V212H110Z" fill="currentColor" />
          <path d="M82 224H278V246H82Z" fill="currentColor" />
          <path d="M126 176V224M162 176V224M198 176V224M234 176V224" stroke="white" strokeOpacity=".55" strokeWidth="7" />
          <path d="M72 145C118 118 242 118 288 145" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
          <rect x="124" y="160" width="112" height="78" fill="none" stroke="currentColor" strokeWidth="8" />
        </svg>
      </div>
    );
  }
  if (code === 'fr') {
    return <div className={`${base} right-4 top-24 text-indigo-900 text-[210px] font-thin leading-none`} aria-hidden>△</div>;
  }
  if (code === 'sa') {
    return <div className={`${base} right-0 top-24 text-amber-900 text-[190px] leading-none`} aria-hidden>☾</div>;
  }
  if (code === 'jp') {
    return <div className={`${base} right-4 top-24 text-rose-900 text-[180px] leading-none`} aria-hidden>鳥居</div>;
  }
  if (code === 'de') {
    return <div className={`${base} right-4 top-24 text-lime-950 text-[190px] leading-none`} aria-hidden>♜</div>;
  }
  return <div className={`${base} right-4 top-24 text-sky-900 text-[180px] leading-none`} aria-hidden>✶</div>;
}

export default function HomePage() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const { region } = useRegion();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const load = async () => {
      let all: Product[] = [];
      try {
        const data = await api.getHomeRecommendations(region.lat, region.lng);
        const seen = new Set<string>();
        all = (data.sections?.flatMap((s: { products?: Product[] }) => s.products || []) || []).filter((p: Product) => {
          if (!p._id || seen.has(p._id)) return false;
          seen.add(p._id);
          return true;
        });
      } catch { /* empty */ }
      if (all.filter(hasImg).length < 6) {
        try {
          const res = await fetch(`${API}/products?limit=80`);
          const data = await res.json();
          const directProducts: Product[] = data.products || [];
          const existingIds = new Set(all.map(p => p._id));
          const extras = directProducts.filter(p => !existingIds.has(p._id));
          all = [...all, ...extras];
        } catch { /* empty */ }
      }
      all.sort((a, b) => (hasImg(a) ? 0 : 1) - (hasImg(b) ? 0 : 1));
      setProducts(all);
      setLoading(false);
    };
    load();
  }, [region.lat, region.lng]);

  const featured = products[0];
  const others = products.slice(1, 9);
  const displayProducts = hasSearched ? searchResults : others;
  const titleClassByRegion: Record<string, string> = {
    cn: 'font-serif tracking-[0.16em] text-4xl md:text-5xl',
    us: 'font-black tracking-tight text-4xl md:text-5xl uppercase',
    de: 'font-serif tracking-[0.08em] text-4xl md:text-5xl',
    jp: 'font-serif tracking-[0.22em] text-4xl md:text-5xl',
    fr: 'font-serif italic tracking-[0.08em] text-4xl md:text-5xl',
    sa: 'font-black tracking-[0.02em] text-4xl md:text-5xl',
  };
  const titleOrnamentByRegion: Record<string, string> = {
    cn: '✦  ◯  方',
    us: '✶  botanical trail  ✶',
    de: '◆  wald garten  ◆',
    jp: '❀  侘寂  ❀',
    fr: '✧  jardin français  ✧',
    sa: '☾  واحة  ☾',
  };

  const handleProductSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const keyword = searchKeyword.trim();
    if (!keyword) {
      setHasSearched(false);
      setSearchResults([]);
      setSearchTotal(0);
      return;
    }
    setSearchLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`${API}/search/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword,
          limit: 24,
          regionCode: region.code,
          lang,
          source: 'home',
          userId: user?.id,
          path: typeof window !== 'undefined' ? window.location.pathname : '/',
        }),
      });
      const data = await res.json();
      setSearchResults(data.products || []);
      setSearchTotal(data.total || 0);
    } catch {
      setSearchResults([]);
      setSearchTotal(0);
    } finally {
      setSearchLoading(false);
    }
  };

  const quickEntries = [
    { href: '/auction', emoji: '🌳', title: t('home.quickEntry.auction.title'), desc: t('home.quickEntry.auction.desc') },
    { href: '/reverse-auction', emoji: '🌷', title: t('home.quickEntry.reverse.title'), desc: t('home.quickEntry.reverse.desc') },
    { href: '/map', emoji: '🗺', title: t('home.quickEntry.map.title'), desc: t('home.quickEntry.map.desc') },
    { href: '/shop', emoji: '🛒', title: t('home.quickEntry.shop.title'), desc: t('home.quickEntry.shop.desc') },
  ];

  const greenCertStats = [
    { label: t('home.greenCert.stats.trees.label'), value: '12,847', unit: t('home.greenCert.stats.trees.unit'), icon: '🌳' },
    { label: t('home.greenCert.stats.carbon.label'), value: '3,256', unit: t('home.greenCert.stats.carbon.unit'), icon: '🏭' },
    { label: t('home.greenCert.stats.coins.label'), value: '162,800', unit: t('home.greenCert.stats.coins.unit'), icon: '🪙' },
    { label: t('home.greenCert.stats.users.label'), value: '4,521', unit: t('home.greenCert.stats.users.unit'), icon: '👥' },
  ];

  const greenCertFeatures = [
    { icon: '🔍', title: t('home.greenCert.features.trace.title'), desc: t('home.greenCert.features.trace.desc'), details: [0,1,2,3].map(i => t(`home.greenCert.features.trace.details.${i}`)) },
    { icon: '👤', title: t('home.greenCert.features.bind.title'), desc: t('home.greenCert.features.bind.desc'), details: [0,1,2,3].map(i => t(`home.greenCert.features.bind.details.${i}`)) },
    { icon: '📏', title: t('home.greenCert.features.measure.title'), desc: t('home.greenCert.features.measure.desc'), details: [0,1,2,3].map(i => t(`home.greenCert.features.measure.details.${i}`)) },
    { icon: '🪙', title: t('home.greenCert.features.trade.title'), desc: t('home.greenCert.features.trade.desc'), details: [0,1,2,3].map(i => t(`home.greenCert.features.trade.details.${i}`)) },
  ];

  const greenCertSteps = [
    { step: 1, title: t('home.greenCert.steps.submit.title'), desc: t('home.greenCert.steps.submit.desc'), icon: '📝' },
    { step: 2, title: t('home.greenCert.steps.review.title'), desc: t('home.greenCert.steps.review.desc'), icon: '✅' },
    { step: 3, title: t('home.greenCert.steps.bind.title'), desc: t('home.greenCert.steps.bind.desc'), icon: '🤝' },
    { step: 4, title: t('home.greenCert.steps.checkin.title'), desc: t('home.greenCert.steps.checkin.desc'), icon: '📸' },
    { step: 5, title: t('home.greenCert.steps.issue.title'), desc: t('home.greenCert.steps.issue.desc'), icon: '🪙' },
    { step: 6, title: t('home.greenCert.steps.use.title'), desc: t('home.greenCert.steps.use.desc'), icon: '💰' },
  ];

  const successStories = [0,1,2,3,4,5].map(i => ({
    img: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80',
      'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=80',
      'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80',
      'https://images.unsplash.com/photo-1598902108854-d1446b65d5f0?w=800&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    ][i],
    title: t(`home.successStories.items.${i}.title`),
    desc: t(`home.successStories.items.${i}.desc`),
    tag: t(`home.successStories.items.${i}.tag`),
  }));

  const reviews = [0,1,2,3,4,5].map(i => ({
    name: t(`home.reviews.items.${i}.name`),
    loc: t(`home.reviews.items.${i}.loc`),
    text: t(`home.reviews.items.${i}.text`),
    stars: 5,
    avatar: ['👷','👰','👨\u200D💼','🧑\u200D🌾','👩\u200D💼','🧑'][i],
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Plant Collector',
    url: SITE_URL,
    description: 'Plant Collector — a smart horticulture supply chain experience for tree auctions, reverse flower auctions, map shopping, garden planting, and green certification.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/shop?keyword={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className={`relative overflow-hidden min-h-screen text-stone-900 pb-16 ${region.pageClass} ${region.skylineClass || ''}`}>
        <RegionalBackdrop code={region.code} />
        {/* Nav */}
        <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b ${region.navClass}`}>
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌿</span>
              <span className="font-semibold tracking-tight text-sm text-stone-900">{t('nav.flowerShop')}</span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-xs text-stone-500 font-medium">
              <a href="/auction" className="hover:text-emerald-700 transition-colors">{t('nav.auction')}</a>
              <a href="/reverse-auction" className="hover:text-emerald-700 transition-colors">{t('nav.reverseAuction')}</a>
              <a href="/map" className="hover:text-emerald-700 transition-colors">{t('nav.map')}</a>
              <a href="/garden" className="hover:text-emerald-700 transition-colors">{t('nav.garden')}</a>
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <a href="/profile" className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 border border-emerald-200 rounded-full px-3 py-1.5 hover:bg-emerald-50 transition-colors">
                  <span>{user.avatar || '🌸'}</span> {user.nickname}
                </a>
              ) : (
                <a href="/login" className="text-xs font-medium text-emerald-700 hover:text-emerald-900 border border-emerald-200 rounded-full px-4 py-1.5 transition-colors">{t('common.login')}</a>
              )}
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="relative z-10 pt-20 pb-16 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center min-h-[420px]">
              <div className="rounded-[2rem] bg-white/45 backdrop-blur-sm border border-white/60 shadow-[0_24px_80px_rgba(15,23,42,0.08)] p-6 md:p-8">
                <p className={`text-xs ${region.accentText} font-semibold tracking-widest uppercase mb-4`}>{t(`regions.${region.code}.badge`)}</p>
                <div className="relative inline-block mb-6">
                  <div className={`text-[10px] md:text-xs ${region.accentText} opacity-60 tracking-[0.42em] uppercase mb-2`}>{titleOrnamentByRegion[region.code] || '✦ Plant Collector ✦'}</div>
                  <h1 className={`relative leading-tight ${titleClassByRegion[region.code] || 'text-4xl md:text-5xl font-bold'}`}>
                    <span className="absolute -left-3 -top-2 w-2 h-2 rounded-full bg-current opacity-25" />
                    <span className="absolute -right-4 top-1/2 w-8 h-px bg-current opacity-20" />
                    <span className={region.accentText}>{t(`regions.${region.code}.title`)}</span><br/><span className="text-xl md:text-2xl not-italic tracking-normal font-semibold text-stone-800">{t(`regions.${region.code}.subtitle`)}</span>
                  </h1>
                  <div className={`mt-2 h-px w-24 ${region.accentBg} opacity-30`} />
                </div>
                <p className="text-stone-500 leading-relaxed max-w-md text-sm md:text-base mb-8">
                  {t(`regions.${region.code}.desc`)}
                </p>
                <div className="flex flex-wrap gap-3">
                  <a href="/auction" className={`${region.accentBg} text-white px-6 py-3 rounded-xl text-sm font-semibold ${region.accentBgHover} transition-colors`}>{t('home.enterAuction')}</a>
                  <a href="/reverse-auction" className={`bg-white ${region.accentText} border ${region.accentBorder} px-6 py-3 rounded-xl text-sm font-semibold transition-colors`}>{t('home.flowerReverse')}</a>
                </div>
                <div className={`mt-5 inline-flex items-center gap-2 text-xs ${region.accentText} ${region.accentSoft} border ${region.accentBorder} rounded-full px-3 py-1.5`}>
                  <span>{region.heroEmoji}</span><span>{t(`regions.${region.code}.plantLine`)}</span>
                </div>
              </div>
              <div className="relative">
                {featured && hasImg(featured) ? (
                  <div className="relative rounded-2xl overflow-hidden border border-stone-200 shadow-lg aspect-[4/3] bg-white/40">
                    <div className="absolute inset-0 opacity-30"><RegionalBackdrop code={region.code} /></div>
                    <img src={getImg(featured)} alt={featured.title || featured.flowerName || ''} className="relative w-full h-full object-cover mix-blend-multiply" />
                  </div>
                ) : (
                  <div className={`relative overflow-hidden rounded-2xl ${region.heroPanel} border border-stone-200 aspect-[4/3] flex items-center justify-center`}>
                    <RegionalBackdrop code={region.code} />
                    <span className="relative text-8xl opacity-40">{region.imageFallback}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Quick Entry */}
        <section className="px-6 pb-16">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickEntries.map(c => (
              <a key={c.href} href={c.href} className={`group rounded-2xl border border-stone-200 bg-white p-5 ${region.cardHover} hover:shadow-md transition-all`}>
                <span className="text-2xl mb-3 block">{c.emoji}</span>
                <h3 className={`text-sm font-semibold text-stone-900 mb-1 ${region.accentText} transition-colors`}>{c.title}</h3>
                <p className="text-[11px] text-stone-400">{c.desc}</p>
              </a>
            ))}
          </div>
        </section>

        {/* Product Search */}
        <section className="relative z-10 px-6 pb-8">
          <div className="max-w-6xl mx-auto rounded-3xl border border-white/70 bg-white/70 backdrop-blur-xl shadow-[0_18px_70px_rgba(15,23,42,0.08)] p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-stone-900">{t('home.searchTitle')}</h2>
                <p className="text-xs text-stone-500 mt-1">{t('home.searchSubtitle')}</p>
              </div>
              {hasSearched && (
                <button onClick={() => { setHasSearched(false); setSearchKeyword(''); setSearchResults([]); setSearchTotal(0); }} className="text-xs text-stone-500 hover:text-stone-900">{t('home.clearSearch')}</button>
              )}
            </div>
            <form onSubmit={handleProductSearch} className="flex flex-col md:flex-row gap-3">
              <input
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                placeholder={t('home.searchPlaceholder')}
                className="flex-1 px-4 py-3 rounded-2xl border border-stone-200 bg-white/90 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
              />
              <button disabled={searchLoading} className={`${region.accentBg} text-white rounded-2xl px-6 py-3 text-sm font-semibold ${region.accentBgHover} disabled:opacity-60 transition-colors`}>
                {searchLoading ? t('home.searching') : t('common.search')}
              </button>
            </form>
            {hasSearched && <p className="text-xs text-stone-500 mt-3">{t('home.searchResultMeta', { keyword: searchKeyword.trim(), count: searchTotal })}</p>}
          </div>
        </section>

        {/* Recommended Products */}
        <section className="relative z-10 px-6 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-stone-900">{hasSearched ? t('home.searchProductsTitle') : t('home.recommendTitle')}</h2>
              <a href="/shop" className={`text-xs ${region.accentText} font-medium transition-colors`}>{t('home.viewMore')}</a>
            </div>
            {(hasSearched ? searchLoading : loading) ? (
              <div className="flex items-center justify-center py-16"><div className="text-3xl animate-pulse">⏳</div></div>
            ) : displayProducts.length === 0 ? (
              <div className="text-center py-16 text-stone-400">{t('home.noProducts')}</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayProducts.map(p => {
                  const img = getImg(p);
                  const price = p.sellPrice || p.price || p.settlementPrice || 0;
                  return (
                    <a key={p._id} href={`/shop`} className="group rounded-2xl border border-stone-200 bg-white overflow-hidden hover:border-emerald-300 hover:shadow-md transition-all">
                      <div className="aspect-square bg-stone-100 flex items-center justify-center overflow-hidden">
                        {img ? <img src={img} alt={p.title || p.flowerName || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <span className="text-4xl opacity-20">🌿</span>}
                      </div>
                      <div className="p-3">
                        <h4 className="text-xs font-medium text-stone-900 truncate">{p.title || p.flowerName || t('home.unnamed')}</h4>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-sm font-bold text-emerald-700">¥{Number(price).toFixed(2)}</span>
                          {p.category && <span className="text-[10px] text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded">{p.category}</span>}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Green Certification */}
        <section className="px-6 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className={`rounded-2xl bg-gradient-to-br ${region.certGradient} p-8 md:p-12 text-white`}>
              <div className="text-center mb-10">
                <p className="text-xs text-emerald-200 font-semibold tracking-widest uppercase mb-2">{t('home.greenCertSubtitle')}</p>
                <h2 className="text-2xl md:text-4xl font-bold mb-3">{t('home.greenCert.title')}</h2>
                <p className="text-emerald-100/80 text-sm max-w-2xl mx-auto">{t('home.greenCert.desc')}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {greenCertStats.map((s, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
                    <span className="text-2xl mb-2 block">{s.icon}</span>
                    <div className="text-xl md:text-2xl font-bold">{s.value}</div>
                    <div className="text-[10px] text-emerald-200">{s.unit} · {s.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                {greenCertFeatures.map((f, i) => (
                  <div key={i} className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{f.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-bold text-sm mb-2">{f.title}</h3>
                        <p className="text-emerald-100/70 text-xs leading-relaxed mb-3">{f.desc}</p>
                        <div className="flex flex-wrap gap-2">
                          {f.details.map((d, j) => (
                            <span key={j} className="bg-emerald-600/30 text-emerald-100 text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/20">{d}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="font-bold text-sm mb-5 text-center">{t('home.greenCert.flowTitle')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {greenCertSteps.map((s, i) => (
                    <div key={i} className="text-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-400/20 border border-emerald-300/30 flex items-center justify-center mx-auto mb-2">
                        <span className="text-lg">{s.icon}</span>
                      </div>
                      <div className="text-[10px] text-emerald-300 font-bold mb-0.5">{t('home.step', { n: s.step })}</div>
                      <div className="text-xs font-semibold mb-0.5">{s.title}</div>
                      <div className="text-[10px] text-emerald-100/60 leading-tight">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center mt-8">
                <a href="/garden" className="inline-block bg-white text-emerald-800 px-8 py-3 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-colors">
                  {t('home.greenCert.apply')}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Success Stories */}
        <section className="px-6 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-xs text-emerald-700 font-semibold tracking-widest uppercase mb-2">{t('home.successStories.subtitle')}</p>
              <h2 className="text-2xl md:text-3xl font-bold text-stone-900">{t('home.successStories.title')}</h2>
              <p className="text-sm text-stone-400 mt-2">{t('home.successStories.desc')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {successStories.map((s, i) => (
                <div key={i} className="group rounded-2xl overflow-hidden border border-stone-200 bg-white hover:shadow-lg transition-all">
                  <div className="relative h-52 overflow-hidden">
                    <img src={s.img} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4">
                      <span className="inline-block bg-emerald-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full mb-1.5">{s.tag}</span>
                      <h3 className="text-white font-bold text-sm">{s.title}</h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-stone-500 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section className="px-6 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-xs text-amber-600 font-semibold tracking-widest uppercase mb-2">{t('home.reviews.subtitle')}</p>
              <h2 className="text-2xl md:text-3xl font-bold text-stone-900">{t('home.reviews.title')}</h2>
              <p className="text-sm text-stone-400 mt-2">{t('home.reviews.desc')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {reviews.map((r, i) => (
                <div key={i} className="rounded-2xl border border-stone-200 bg-white p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{r.avatar}</span>
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{r.name}</p>
                      <p className="text-[10px] text-stone-400">{r.loc}</p>
                    </div>
                    <div className="ml-auto flex gap-0.5">
                      {Array.from({ length: r.stars }).map((_, j) => (
                        <span key={j} className="text-amber-400 text-xs">★</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed">&ldquo;{r.text}&rdquo;</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="py-10 px-6 border-t border-stone-200/60 bg-white/45 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-[1.2fr_2fr] gap-6 items-start">
              <div>
                <div className={`font-semibold tracking-tight text-base ${region.accentText} mb-1`}>{t('home.footer.name')}</div>
                <div className="text-[11px] text-stone-400">{t('home.footer.copyright')}</div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                <a href="tel:+8618511987921" className="rounded-2xl border border-stone-200 bg-white/75 p-4 hover:shadow-sm transition-shadow">
                  <div className="text-stone-400 mb-1">{t('home.footer.phone')}</div>
                  <div className="font-semibold text-stone-800">(+86) 18511987921</div>
                </a>
                <a href="mailto:huang13849@hotmail.com" className="rounded-2xl border border-stone-200 bg-white/75 p-4 hover:shadow-sm transition-shadow">
                  <div className="text-stone-400 mb-1">{t('home.footer.email')}</div>
                  <div className="font-semibold text-stone-800 break-all">huang13849@hotmail.com</div>
                </a>
                <div className="rounded-2xl border border-stone-200 bg-white/75 p-4">
                  <div className="text-stone-400 mb-1">{t('home.footer.address')}</div>
                  <div className="font-semibold text-stone-800">中国北京市丰台区新宫</div>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
      <TabBar />
    </>
  );
}
