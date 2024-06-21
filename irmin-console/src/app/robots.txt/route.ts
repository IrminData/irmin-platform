export async function GET() {
  const BASE_URL = process.env.BASE_URL ?? 'https://irmin.dev';
  let txt = `
    # *
    User-agent: *
    Allow: /
    Disallow: /api/
    Disallow: /_next/
    Disallow: /app/
    
    # Sitemaps
    Sitemap: ${BASE_URL}/sitemap.xml
    `;

  const requireAuth = process.env.REQUIRE_ENV_AUTH ?? 'true';
  if (requireAuth === 'true') {
    txt = `
    User-agent: *
    Disallow: /
      `;
  }

  return new Response(txt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
