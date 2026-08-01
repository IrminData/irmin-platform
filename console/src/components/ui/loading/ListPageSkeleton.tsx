import ListShellSkeleton from '@/components/ui/loading/ListShellSkeleton';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Mirror skeleton for list pages — connections, repositories,
 * workflows, ai-applications, settings/users, settings/invites,
 * settings/tags. Same container as the real page, same header row
 * (title + primary button), same search bar, then a
 * `<ListShellSkeleton>` whose DOM is byte-identical to what
 * `<CardOrNormalList loading>` paints when the client page mounts.
 */
const ListPageSkeleton = ({
  columnCount = 4,
  showSearch = true,
  showCreateButton = true,
}: {
  columnCount?: number;
  showSearch?: boolean;
  showCreateButton?: boolean;
}) => {
  return (
    <div className='relative container mx-auto max-w-7xl px-4 py-8'>
      <div className='my-4 flex flex-row items-center justify-between gap-4'>
        <LoadingSkeleton className='h-9 w-56 max-w-full' />
        {showCreateButton && (
          <LoadingSkeleton className='h-11 w-44 shrink-0 rounded-md' />
        )}
      </div>
      <div className='py-4'>
        {showSearch && (
          <LoadingSkeleton className='mb-4 h-11 w-full rounded-md' />
        )}
        <ListShellSkeleton columnCount={columnCount} />
      </div>
    </div>
  );
};

export default ListPageSkeleton;
