import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Generic list skeleton — N rounded rows with optional avatar and
 * trailing action buttons. Used for sidebars and small lists; for
 * full list pages prefer `ListPageSkeleton` or `ListShellSkeleton`.
 */
function ListSkeleton({
  items = 5,
  showAvatar = false,
  showActions = false,
  className = '',
}: {
  items?: number;
  showAvatar?: boolean;
  showActions?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`
        flex flex-col gap-3
        ${className}
      `}
    >
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={`list-item-${i}`}
          className={`
            flex items-center gap-4 rounded-lg border border-border bg-card p-4
          `}
        >
          {showAvatar && (
            <LoadingSkeleton className='size-10 shrink-0 rounded-full' />
          )}
          <div className='flex flex-1 flex-col gap-2'>
            <LoadingSkeleton className='h-4 w-3/4' />
            <LoadingSkeleton className='h-3 w-1/2' />
          </div>
          {showActions && (
            <div className='flex gap-2'>
              <LoadingSkeleton className='size-8 rounded-md' />
              <LoadingSkeleton className='size-8 rounded-md' />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ListSkeleton;
