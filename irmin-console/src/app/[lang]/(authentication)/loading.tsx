import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Loading UI for the Website
 *
 * When Next.js is processing server-side data fetching,
 * it shows this loading UI element.
 *
 * This is used for the website pages.
 *
 * It uses LoadingSkeleton component to show the loading animation.
 */
export default function WebsiteLoading() {
  return (
    <div
      className='flex h-full w-full flex-col items-center justify-center p-2'
      id='website-loading'
    >
      <LoadingSkeleton className='h-96' />
    </div>
  );
}
