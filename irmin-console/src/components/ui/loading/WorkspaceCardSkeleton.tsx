/**
 * Workspace card skeleton component for loading states
 */
export function WorkspaceCardSkeleton({
  items = 6,
  className = '',
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex w-full flex-wrap content-stretch items-stretch justify-start ${className}`}
    >
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className='w-full min-w-1/2 p-2 lg:max-w-60'>
          <div className='bg-card text-card-foreground flex h-full animate-pulse flex-col rounded-xl p-2 text-xs shadow-xs lg:p-4 lg:text-base'>
            {/* Workspace label skeleton */}
            <div className='h-3 w-16 rounded bg-gray-200 dark:bg-gray-800'></div>

            {/* Workspace name skeleton */}
            <div className='mt-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800'></div>

            {/* Description skeleton */}
            <div className='mt-2 mb-4 space-y-1'>
              <div className='h-3 w-4/5 rounded bg-gray-200 dark:bg-gray-800'></div>
              <div className='h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-800'></div>
            </div>

            {/* Grow spacer */}
            <div className='grow'></div>

            {/* Users section skeleton */}
            <div className='mt-auto flex items-center justify-between gap-0'>
              <div className='flex -space-x-2'>
                {/* User avatars skeleton */}
                <div className='h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-800'></div>
                <div className='h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-800'></div>
                <div className='h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-800'></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default WorkspaceCardSkeleton;
