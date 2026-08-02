import DetailHeaderSkeleton from '@/components/ui/loading/DetailHeaderSkeleton';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import TabsWithBackButtonSkeleton from '@/components/ui/loading/TabsWithBackButtonSkeleton';

/**
 * Mirror skeleton for `ConnectionLayoutWrapper`.
 *
 * Header with metadata + title + description + tags, and an inline
 * horizontal row of actions on the right (`flex items-center gap-2`):
 * Test Connection + AssetSharePopover. Inner wrapper uses
 * `lg:justify-between` (left column has NO `flex-1`). Then
 * `TabsWithBackButton` with 3 primary tabs (Overview, Schema,
 * Connector) + "More" dropdown.
 */
function ConnectionLayoutSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <div className='relative container mx-auto max-w-7xl'>
        <DetailHeaderSkeleton
          metadataItems={2}
          justifyBetween
          leftFill={false}
          rightSlot={
            <div className='flex items-center gap-2'>
              {/* Test connection (size='sm' outline) */}
              <LoadingSkeleton className='h-9 w-36 rounded-md' />
              {/* AssetSharePopover trigger (size='sm') */}
              <LoadingSkeleton className='h-9 w-20 rounded-md' />
            </div>
          }
        />
        <TabsWithBackButtonSkeleton tabCount={3} showMore />
      </div>
      <div className='relative container mx-auto max-w-7xl px-4'>
        <LoadingSkeleton className='h-64 w-full rounded-lg' />
      </div>
    </div>
  );
}

export default ConnectionLayoutSkeleton;
