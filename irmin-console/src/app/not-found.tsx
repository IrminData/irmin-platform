import WebsiteError from '@/components/misc/websiteError';

/**
 * The page component for the 404 Not Found page
 *
 * @returns The 404 Not Found page
 */
export default function NotFoundPage() {
  return <WebsiteError pageNotFound={true} />;
}
