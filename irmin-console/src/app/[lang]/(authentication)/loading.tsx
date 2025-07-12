import FormPageSkeleton from '@/components/ui/loading/FormPageSkeleton';

/**
 * Loading UI for the Website
 *
 * When Next.js is processing server-side data fetching,
 * it shows this loading UI element.
 *
 * This is used for the website pages.
 *
 * It uses FormPageSkeleton component to show the loading animation.
 */
export default function WebsiteLoading() {
  return <FormPageSkeleton />;
}
