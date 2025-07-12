/**
 * Skeleton for detail pages (repository, workflow, etc.)
 */
const DetailPageSkeleton = () => {
  return (
    <div className='relative container mx-auto max-w-7xl px-4 py-8'>
      {/* Header section */}
      <div className='mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div className='flex-1'>
          {/* Title */}
          <div className='mb-2 h-8 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-800 lg:h-10 lg:w-80'></div>
          
          {/* Subtitle/description */}
          <div className='space-y-1'>
            <div className='h-4 w-96 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
            <div className='h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
          </div>
        </div>

        {/* Action buttons */}
        <div className='flex items-center gap-2'>
          <div className='h-10 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
          <div className='h-10 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className='mb-6 border-b border-gray-200 dark:border-gray-800'>
        <div className='flex gap-6'>
          {[...Array(4)].map((_, index) => (
            <div
              key={`tab-skeleton-${index}`}
              className='h-6 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800'
            ></div>
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className='space-y-6'>
        {/* Stats/info cards */}
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
          {[...Array(4)].map((_, index) => (
            <div
              key={`stat-card-${index}`}
              className='bg-card rounded-lg border p-4'
            >
              <div className='space-y-2'>
                <div className='h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
                <div className='h-8 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
              </div>
            </div>
          ))}
        </div>

        {/* Main content block */}
        <div className='bg-card rounded-lg border p-6'>
          <div className='space-y-4'>
            <div className='h-6 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
            <div className='space-y-2'>
              {[...Array(6)].map((_, index) => (
                <div
                  key={`content-line-${index}`}
                  className='h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-800'
                  style={{ width: `${Math.random() * 40 + 60}%` }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailPageSkeleton;