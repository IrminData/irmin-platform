import LoadingSkeleton from '@/components/misc/LoadingSkeleton';

/**
 * Loading UI for the Website
 *
 * @remarks
 * When Next.js is processing server-side data fetching,
 * it shows this loading UI element.
 *
 * This is used for the website pages.
 *
 * It uses LoadingSkeleton component to show the loading animation.
 *
 * @returns Loading UI element
 */
export default function Websiteloading() {
  return (
    <div className='flex h-full w-full flex-col items-center justify-center p-2'>
      <LoadingSkeleton />
    </div>
  );
}
