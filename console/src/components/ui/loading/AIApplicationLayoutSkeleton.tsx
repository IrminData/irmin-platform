import DetailHeaderSkeleton from '@/components/ui/loading/DetailHeaderSkeleton';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import TabsWithBackButtonSkeleton from '@/components/ui/loading/TabsWithBackButtonSkeleton';

/**
 * Mirror skeleton for `AIApplicationLayoutWrapper` + `AIApplicationHeader`.
 *
 * Header with metadata (owner + connector) + title + description +
 * inline tags on the left (`flex-1`), and a single AssetSharePopover
 * on the right as a horizontal row (`flex items-center gap-2`). No
 * `lg:justify-between` — left `flex-1` claims width. Then
 * `TabsWithBackButton` with 2 primary tabs (Overview, Activity) +
 * "More" dropdown (Documentation, Policies, Logs, Settings).
 */
function AIApplicationLayoutSkeleton({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div className={className}>
      <div className='relative container mx-auto max-w-7xl'>
        <DetailHeaderSkeleton
          metadataItems={2}
          leftFill
          showTags={false}
          rightSlot={
            <div className='flex items-center gap-2'>
              {/* AssetSharePopover trigger (size='sm') */}
              <LoadingSkeleton className='h-9 w-20 rounded-md' />
            </div>
          }
        />
        <TabsWithBackButtonSkeleton tabCount={2} showMore />
      </div>
      <div className='relative container mx-auto max-w-7xl px-4'>
        <LoadingSkeleton className='h-80 w-full rounded-lg' />
      </div>
    </div>
  );
}

export default AIApplicationLayoutSkeleton;
