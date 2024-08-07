import WebsiteError from '@/components/website/websiteError';

/**
 * The page component for the 404 Not Found page
 */
export default function NotFound() {
  return <WebsiteError pageNotFound={true} />;
}
