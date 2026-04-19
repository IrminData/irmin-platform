import { NextResponse } from 'next/server';

import { env } from '@/config/env.server';

export const dynamic = 'force-static'; // This is a static route

/**
 * robots.txt route
 *
 * @remarks
 *
 * This route is used to provide instructions to web crawlers
 * about which pages to crawl and which to avoid.
 *
 * Currently, the route is set to allow all pages to be crawled
 * except for the API routes, docs, Irmin Console and Next.js files.
 *
 * @returns response - text file with instructions for web crawlers
 */
export async function GET() {
  const app_base = env.NEXT_PUBLIC_BASE_URL;
  let txt = `
    # *
    User-agent: *
    Allow: /
    Disallow: /api/
    Disallow: /_next/
    Disallow: /frontend-docs/

    # Sitemaps
    Sitemap: ${app_base}/sitemap.xml
    `;

  if (env.REQUIRE_ENV_AUTH) {
    txt = `
    User-agent: *
    Disallow: /
      `;
  }

  return new NextResponse(txt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
