/**
 * List skeleton component for loading states
 */
export function ListSkeleton({
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
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className='bg-card border-border flex items-center space-x-4 rounded-lg border p-4'
        >
          {/* Avatar */}
          {showAvatar && (
            <div className='h-10 w-10 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-800'></div>
          )}

          {/* Content */}
          <div className='flex-1 space-y-2'>
            <div className='h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800'></div>
            <div className='h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-800'></div>
          </div>

          {/* Actions */}
          {showActions && (
            <div className='flex space-x-2'>
              <div className='h-8 w-8 rounded bg-gray-200 dark:bg-gray-800'></div>
              <div className='h-8 w-8 rounded bg-gray-200 dark:bg-gray-800'></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ListSkeleton;
