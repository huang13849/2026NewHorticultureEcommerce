import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const baseUrl = 'https://horiculture.space';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/auction', '/reverse-auction', '/map', '/garden', '/shop', '/supplier-videos'].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' as const : 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));
  return routes;
}
