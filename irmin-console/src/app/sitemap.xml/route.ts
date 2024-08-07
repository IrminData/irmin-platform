import { detectLocaleFromURL, languages } from '@/dictionaries';
import WordPress from '@/services/wordpress';

import { getURL } from '@/utils/wordpress';

/**
 * sitemap.xml route
 *
 * @remarks
 *
 * This route is used to generate an XML sitemap for the website.
 *
 * The sitemap includes all static pages, posts and pages fetched from the WordPress API.
 *
 * Note that the sitemap does not include the API, docs or Irmin Portal routes.
 *
 * @returns XML sitemap for the website
 */
export async function GET() {
  const wordpress = WordPress.getInstance();

  const app_base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://irmin.dev';

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

  const pages = await wordpress.getPages();
  if (pages) {
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      urls.push(`
        <url>
          <loc>${app_base}${getURL(page.link)}</loc>
          <changefreq>daily</changefreq>
          <priority>0.7</priority>
        </url>
      `);
    }
  }

  const posts = await wordpress.getPosts();
  if (posts) {
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const postLang = detectLocaleFromURL(post.link);
      urls.push(`
        <url>
          <loc>${app_base}${`/${postLang ? postLang + '/' : ''}article/${post.slug}/`}</loc>
          <changefreq>daily</changefreq>
          <priority>0.7</priority>
        </url>
      `);
    }
  }

  // Build sitemap
  const xml = `
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls.join('')}
    </urlset>
  `;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
