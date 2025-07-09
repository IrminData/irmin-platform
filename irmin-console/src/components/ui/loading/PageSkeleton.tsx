/**
 * Page-level skeleton component for loading states
 */
export function PageSkeleton({
  showHeader = true,
  showSidebar = false,
  contentRows = 4,
  className = '',
}: {
  showHeader?: boolean;
  showSidebar?: boolean;
  contentRows?: number;
  className?: string;
}) {
  return (
    <div className={`animate-pulse ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className='mb-6'>
          <div className='mb-4 h-8 w-1/3 rounded-lg bg-gray-200 dark:bg-gray-800'></div>
          <div className='h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-800'></div>
        </div>
      )}

      <div className={`flex gap-6 ${showSidebar ? 'flex-row' : 'flex-col'}`}>
        {/* Sidebar */}
        {showSidebar && (
          <div className='w-80 flex-shrink-0'>
            <div className='space-y-3'>
              <div className='h-10 rounded-lg bg-gray-200 dark:bg-gray-800'></div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className='h-16 rounded-lg bg-gray-200 dark:bg-gray-800'
                ></div>
              ))}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className='flex-1'>
          <div className='space-y-4'>
            {Array.from({ length: contentRows }).map((_, i) => (
              <div key={i} className='space-y-2'>
                <div className='h-6 w-1/4 rounded bg-gray-200 dark:bg-gray-800'></div>
                <div className='h-20 rounded-lg bg-gray-200 dark:bg-gray-800'></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PageSkeleton;
