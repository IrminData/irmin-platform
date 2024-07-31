import { WordpressLink } from '@/types/website/Wordpress';

/**
 * Get the URL from a WordPress link object.
 * Removes the WordPress URL from the link.
 * @param url - Whichever format WordPress returns the URL in
 * @returns The URL as a simple string, or '#' if the URL is null
 */
export function getURL(url: string | WordpressLink | null): string {
  if (!url) return '#';
  const wpURL =
    process.env.NEXT_PUBLIC_WORDPRESS_URL ?? 'https://cms.irmin.dev';
  const link = typeof url === 'string' ? url : url.url;
  return link.replace(wpURL, '');
}
