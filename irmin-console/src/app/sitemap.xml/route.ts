export async function GET() {
  const NEXT_PUBLIC_BASE_URL =
    process.env.NEXT_PUBLIC_BASE_URL ?? 'https://irmin.dev';

  const staticPaths = [
    '/',
    '/blog',
    '/contact',
    '/pricing',
    '/sign-in',
    '/sign-up',
    '/team',
    '/legal/privacy-policy',
    '/legal/terms-of-use',
  ];

  const urls = staticPaths
    .map((path) => {
      return `
      <url>
        <loc>${NEXT_PUBLIC_BASE_URL}${path}</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
      </url>
    `;
    })
    .join('');

  const xml = `
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls}
    </urlset>
  `;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
