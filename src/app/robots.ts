import type { MetadataRoute } from 'next';

/**
 * Next.js Dynamic Robots Generator
 * Informs search engines (Google, Bing, Chrome crawlers) to index public marketing pages
 * while strictly disallowing private customer cockpits and operational APIs.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stem-cogent.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/pricing',
          '/about',
          '/contact',
          '/features',
          '/features/*',
        ],
        disallow: [
          '/overview',
          '/insight',
          '/marketing',
          '/gap',
          '/gap-matrix',
          '/library',
          '/settings',
          '/audit',
          '/operations',
          '/onboarding',
          '/api/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
