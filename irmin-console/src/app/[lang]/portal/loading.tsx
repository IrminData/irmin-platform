import LoadingSkeleton from '@/components/misc/LoadingSkeleton';

/**
 * Loading UI for the Portal
 *
 * @remarks
 *
 * When Next.js is processing server-side data fetching,
 * it shows this loading UI element.
 *
 * @returns Loading UI element
 */
export default function PortalLoading() {
  return (
    <div className='px-4'>
      <LoadingSkeleton className='h-96 w-full' />
    </div>
  );
}
