/**
 * Skeleton for editor page
 */
const EditorSkeleton = () => {
  return (
    <div className='h-full w-full'>
      {/* Editor tabs */}
      <div className='border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900'>
        <div className='flex items-center gap-2 px-4 py-2'>
          {[...Array(3)].map((_, index) => (
            <div
              key={`tab-skeleton-${index}`}
              className='h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800'
            ></div>
          ))}
          <div className='h-6 w-6 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
        </div>
      </div>

      {/* Editor content area */}
      <div className='flex h-full'>
        {/* Main editor area */}
        <div className='flex-1 p-4'>
          <div className='h-full w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800'></div>
        </div>

        {/* Sidebar (file tree) */}
        <div className='w-64 border-l border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900'>
          <div className='space-y-2'>
            <div className='h-6 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
            <div className='space-y-1'>
              {[...Array(8)].map((_, index) => (
                <div
                  key={`file-skeleton-${index}`}
                  className='flex items-center gap-2'
                >
                  <div className='h-4 w-4 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
                  <div className='h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Script results section */}
      <div className='border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900'>
        <div className='mb-2 flex items-center justify-between'>
          <div className='h-5 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
          <div className='h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
        </div>
        <div className='h-32 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
      </div>
    </div>
  );
};

export default EditorSkeleton;