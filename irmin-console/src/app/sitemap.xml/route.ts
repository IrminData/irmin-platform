import { getURL } from '@/lib/utils/wordpressLinkUtils';
import WordPress from '@/lib/wordpress';

export async function GET() {
  const wordpress = WordPress.getInstance();

  const NEXT_PUBLIC_BASE_URL =
    process.env.NEXT_PUBLIC_BASE_URL ?? 'https://irmin.dev';

  const staticPaths = ['/fi/', '/en/', '/sign-in/', '/sign-up/'];

  const urls = staticPaths.map((path) => {
    return `
      <url>
        <loc>${NEXT_PUBLIC_BASE_URL}${path}</loc>
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
          <loc>${NEXT_PUBLIC_BASE_URL}${getURL(page.link)}</loc>
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
      const postLang = post.link.includes('/fi/') ? 'fi' : 'en';
      urls.push(`
        <url>
          <loc>${NEXT_PUBLIC_BASE_URL}${`/${postLang}/article/${post.slug}/`}</loc>
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
