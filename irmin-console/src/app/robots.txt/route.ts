export async function GET() {
  const NEXT_PUBLIC_BASE_URL =
    process.env.NEXT_PUBLIC_BASE_URL ?? 'https://irmin.dev';
  let txt = `
    # *
    User-agent: *
    Allow: /
    Disallow: /api/
    Disallow: /_next/
    Disallow: /portal/
    
    # Sitemaps
    Sitemap: ${NEXT_PUBLIC_BASE_URL}/sitemap.xml
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
