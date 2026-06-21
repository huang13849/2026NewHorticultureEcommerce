import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const baseUrl = 'https://horiculture.space';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/profile', '/cart', '/payment', '/login', '/seo'] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
