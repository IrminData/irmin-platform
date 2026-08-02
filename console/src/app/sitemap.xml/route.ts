import { NextResponse } from 'next/server';

import { env } from '@/config/env.server';

import { languages } from '@/lib/dict';

export const dynamic = 'force-static'; // This is a static route

/**
 * sitemap.xml route
 *
 * @returns XML sitemap for the console
 */
export async function GET() {
  const app_base = env.NEXT_PUBLIC_BASE_URL;

  const staticPaths = ['/sign-in/', '/sign-up/'];
  languages.map((lang) => {
    staticPaths.push(`/${lang.code}/`);
  });

  const urls = staticPaths.map((path) => {
    return `
      <url>
        <loc>${app_base}${path}</loc>
        <changefreq>daily</changefreq>
        <priority>1</priority>
      </url>
    `;
  });

  // Build sitemap
  const xml = `
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls.join('')}
    </urlset>
  `;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
