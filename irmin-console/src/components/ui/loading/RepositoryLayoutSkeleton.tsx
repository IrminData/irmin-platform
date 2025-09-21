/**
 * Repository layout skeleton component
 * Matches the structure of RepositoryHeader and repository content
 */
function RepositoryLayoutSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`
        animate-pulse
        ${className}
      `}
    >
      {/* Repository Header Skeleton */}
      <div className='mx-auto max-w-7xl px-4 py-6'>
        {/* Breadcrumb and actions */}
        <div className='mb-6 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div
              className={`
                h-4 w-16 rounded bg-gray-200
                dark:bg-gray-800
              `}
            />
            <div
              className={`
                h-4 w-2 rounded bg-gray-200
                dark:bg-gray-800
              `}
            />
            <div
              className={`
                h-4 w-24 rounded bg-gray-200
                dark:bg-gray-800
              `}
            />
          </div>
          <div className='flex gap-2'>
            <div
              className={`
                h-8 w-20 rounded bg-gray-200
                dark:bg-gray-800
              `}
            />
            <div
              className={`
                h-8 w-24 rounded bg-gray-200
                dark:bg-gray-800
              `}
            />
          </div>
        </div>

        {/* Repository title and metadata */}
        <div className='mb-6'>
          <div className='mb-2 flex items-center gap-2'>
            <div
              className={`
                h-6 w-32 rounded bg-gray-200
                dark:bg-gray-800
              `}
            />
            <div
              className={`
                h-5 w-16 rounded bg-gray-200
                dark:bg-gray-800
              `}
            />
          </div>
          <div
            className={`
              h-8 w-1/2 rounded bg-gray-200
              dark:bg-gray-800
            `}
          />
          <div
            className={`
              mt-2 h-4 w-2/3 rounded bg-gray-200
              dark:bg-gray-800
            `}
          />
          <div className='mt-2 flex gap-2'>
            <div
              className={`
                h-5 w-12 rounded bg-gray-200
                dark:bg-gray-800
              `}
            />
            <div
              className={`
                h-5 w-16 rounded bg-gray-200
                dark:bg-gray-800
              `}
            />
            <div
              className={`
                h-5 w-20 rounded bg-gray-200
                dark:bg-gray-800
              `}
            />
          </div>
        </div>

        {/* Tabs skeleton */}
        <div
          className={`
            border-b border-gray-200
            dark:border-gray-700
          `}
        >
          <div className='flex gap-6'>
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={`tab-${i}`}
                className={`
                  h-10 w-20 rounded bg-gray-200
                  dark:bg-gray-800
                `}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className='mx-auto max-w-7xl px-4 py-6'>
        <div className='space-y-4'>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={`content-${i}`} className='space-y-2'>
              <div
                className={`
                  h-6 w-1/4 rounded bg-gray-200
                  dark:bg-gray-800
                `}
              />
              <div
                className={`
                  h-20 rounded-lg bg-gray-200
                  dark:bg-gray-800
                `}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RepositoryLayoutSkeleton;
