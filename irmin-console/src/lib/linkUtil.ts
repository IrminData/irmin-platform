import { WordpressLink } from '@/types/Wordpress';

export function getURL(url: string | WordpressLink | null): string {
  if (!url) return '#';
  const wpURL =
    process.env.NEXT_PUBLIC_WORDPRESS_URL ?? 'https://cms.irmin.dev';
  const link = typeof url === 'string' ? url : url.url;
  return link.replace(wpURL, '');
}
