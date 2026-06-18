import type { MetadataRoute } from 'next';

const baseUrl = 'https://2026newhorticultureecommerce.pages.dev';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/profile', '/cart', '/payment', '/login', '/seo'] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
