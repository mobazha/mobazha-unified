import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.mobazha.org';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/checkout/', '/payment/', '/orders/', '/settings/', '/api/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
