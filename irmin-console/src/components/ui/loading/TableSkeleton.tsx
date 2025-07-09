/**
 * Table skeleton component for loading states
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  className = '',
}: {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className='border-border overflow-hidden rounded-lg border'>
        {/* Header */}
        {showHeader && (
          <div className='bg-card border-border border-b'>
            <div className='flex'>
              {Array.from({ length: columns }).map((_, i) => (
                <div key={i} className='flex-1 p-4'>
                  <div className='h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800'></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rows */}
        <div className='bg-background'>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className='border-border flex border-b last:border-b-0'
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div key={colIndex} className='flex-1 p-4'>
                  <div className='h-4 w-full rounded bg-gray-200 dark:bg-gray-800'></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TableSkeleton;
