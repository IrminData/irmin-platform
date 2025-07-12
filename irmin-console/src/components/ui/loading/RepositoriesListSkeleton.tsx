import { TbSearch } from 'react-icons/tb';

/**
 * Skeleton for repositories list page
 */
const RepositoriesListSkeleton = () => {
  return (
    <div className='relative container mx-auto max-w-7xl px-4 py-8'>
      {/* Header with title and button */}
      <div className='my-4 flex flex-row items-center justify-between gap-4'>
        <div className='h-10 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800 sm:h-12 sm:w-64 lg:h-16 lg:w-80'></div>
        <div className='h-10 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-800 sm:h-12 sm:w-44'></div>
      </div>

      {/* Search bar */}
      <div className='py-4'>
        <div className='mb-4 flex w-full items-center gap-2 rounded-md bg-gray-100 p-2 text-gray-900 dark:bg-gray-800 dark:text-gray-200'>
          <TbSearch className='opacity-50' />
          <div className='h-6 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700'></div>
        </div>

        {/* Table skeleton for larger screens */}
        <div className='hidden sm:block'>
          <div className='bg-popover/10 w-full rounded-lg border p-2 dark:border-gray-800'>
            {/* Table header */}
            <div className='border-b border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900'>
              <div className='flex p-2'>
                <div className='h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700'></div>
                <div className='ml-auto h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700'></div>
              </div>
            </div>
            
            {/* Table rows */}
            {[...Array(6)].map((_, index) => (
              <div
                key={`table-row-skeleton-${index}`}
                className='border-b border-gray-200 p-2 dark:border-gray-800'
              >
                <div className='flex items-center justify-between'>
                  <div className='flex-1'>
                    <div className='h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
                    <div className='mt-1 h-3 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
                  </div>
                  <div className='flex items-center gap-4'>
                    <div className='flex flex-col gap-1'>
                      <div className='h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
                      <div className='h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
                    </div>
                    <div className='h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card skeleton for mobile */}
        <div className='block sm:hidden'>
          <div className='bg-popover/10 h-full w-full rounded-lg border p-2 dark:border-gray-800'>
            <div className='grid grid-cols-1 gap-2'>
              {[...Array(4)].map((_, index) => (
                <div
                  key={`card-skeleton-${index}`}
                  className='animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-900 dark:bg-gray-900'
                >
                  <div className='flex items-start justify-between'>
                    <div className='flex-1'>
                      <div className='h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
                      <div className='mt-1 h-3 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
                    </div>
                    <div className='h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
                  </div>
                  <div className='mt-4 flex justify-between'>
                    <div className='h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
                    <div className='h-8 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepositoriesListSkeleton;