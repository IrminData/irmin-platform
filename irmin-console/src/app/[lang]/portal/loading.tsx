import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

/**
 * Loading UI for the Portal
 *
 * @remarks
 *
 * When Next.js is processing server-side data fetching,
 * it shows this loading UI element
 */
export default function PortalLoading() {
  return (
    <div className='px-4' id='portal-loading-skeleton'>
      <LoadingSkeleton className='min-h-[80vh]' />;
    </div>
  );
}
