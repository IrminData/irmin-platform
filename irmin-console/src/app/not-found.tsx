import WebsiteFooter from '@/components/website/footer/WebsiteFooter';
import WebsiteNavigation from '@/components/website/navigation/WebsiteNavigation';
import WebsiteError from '@/components/website/websiteError';

/**
 * The page component for the 404 Not Found page
 */
export default function NotFound() {
  return (
    <>
      <WebsiteNavigation />
      <WebsiteError pageNotFound={true} />
      <WebsiteFooter />
    </>
  );
}
