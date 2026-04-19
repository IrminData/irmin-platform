import DetailHeaderSkeleton from '@/components/ui/loading/DetailHeaderSkeleton';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import TabsWithBackButtonSkeleton from '@/components/ui/loading/TabsWithBackButtonSkeleton';

/**
 * Mirror skeleton for `WorkflowLayoutWrapper`.
 *
 * Header with metadata (owner + status badge + tags), title,
 * description on the left (`flex-1`), and a vertical stack on the
 * right (`min-w-60 flex-col gap-2`): `size='lg'` Trigger Run CTA +
 * AssetSharePopover. Then `TabsWithBackButton` with 5 primary tabs
 * (Overview, Configure, Field Mapper, Schedule, Data) + "More"
 * dropdown.
 */
function WorkflowLayoutSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <div className='relative container mx-auto max-w-7xl'>
        <DetailHeaderSkeleton
          metadataItems={3}
          leftFill
          rightSlot={
            <div className='flex min-w-60 flex-col gap-2'>
              {/* Trigger Run (size='lg' → h-11) */}
              <LoadingSkeleton className='h-11 w-full rounded-md' />
              {/* AssetSharePopover trigger (size='sm' → h-9) */}
              <LoadingSkeleton className='h-9 w-full rounded-md' />
            </div>
          }
        />
        <TabsWithBackButtonSkeleton tabCount={5} showMore />
      </div>
      <div className='relative container mx-auto max-w-7xl px-4'>
        <LoadingSkeleton className='h-80 w-full rounded-lg' />
      </div>
    </div>
  );
}

export default WorkflowLayoutSkeleton;
