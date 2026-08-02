import DetailHeaderSkeleton from '@/components/ui/loading/DetailHeaderSkeleton';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import TabsWithBackButtonSkeleton from '@/components/ui/loading/TabsWithBackButtonSkeleton';

/**
 * Mirror skeleton for `RepositoryLayoutWrapper` + `RepositoryHeader`.
 *
 * Header with metadata row + title + description + tags on the left
 * (takes remaining width via `flex-1`) and a vertical stack of three
 * buttons on the right (`min-w-60 flex-col gap-2`): BranchSelector,
 * AssetSharePopover, and ZIP share. Then `TabsWithBackButton` with 6
 * primary tabs (Objects, Schema, Commits, Tags, Branches, Compare) +
 * "More" dropdown (Documentation, Policies, Logs, Settings).
 */
function RepositoryLayoutSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <div className='relative container mx-auto max-w-7xl'>
        <DetailHeaderSkeleton
          metadataItems={3}
          leftFill
          rightSlot={
            <div className='flex min-w-60 flex-col gap-2'>
              {/* Branch selector */}
              <LoadingSkeleton className='h-9 w-full rounded-md' />
              {/* Asset share popover (size='sm') */}
              <LoadingSkeleton className='h-9 w-full rounded-md' />
              {/* ZIP share popover trigger (size='sm') */}
              <LoadingSkeleton className='h-9 w-full rounded-md' />
            </div>
          }
        />
        <TabsWithBackButtonSkeleton tabCount={6} showMore />
      </div>
      <div className='relative container mx-auto max-w-7xl px-4'>
        <LoadingSkeleton className='h-80 w-full rounded-lg' />
      </div>
    </div>
  );
}

export default RepositoryLayoutSkeleton;
