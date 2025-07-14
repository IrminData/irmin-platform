/**
 * List skeleton component for loading states
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
  const itemKeys = Array.from(
    { length: items },
    (_, i) => `list-skeleton-item-${i}`
  );
  return (
    <div
      className={`
        animate-pulse space-y-3
        ${className}
      `}
    >
      {itemKeys.map((key) => (
        <div
          key={key}
          className={`
            flex items-center space-x-4 rounded-lg border border-border bg-card
            p-4
          `}
        >
          {/* Avatar */}
          {showAvatar && (
            <div
              className={`
                size-10 shrink-0 rounded-full bg-gray-200
                dark:bg-gray-800
              `}
            />
          )}

          {/* Content */}
          <div className='flex-1 space-y-2'>
            <div
              className={`
                h-4 w-3/4 rounded bg-gray-200
                dark:bg-gray-800
              `}
            />
            <div
              className={`
                h-3 w-1/2 rounded bg-gray-200
                dark:bg-gray-800
              `}
            />
          </div>

          {/* Actions */}
          {showActions && (
            <div className='flex space-x-2'>
              <div
                className={`
                  size-8 rounded bg-gray-200
                  dark:bg-gray-800
                `}
              />
              <div
                className={`
                  size-8 rounded bg-gray-200
                  dark:bg-gray-800
                `}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ListSkeleton;
