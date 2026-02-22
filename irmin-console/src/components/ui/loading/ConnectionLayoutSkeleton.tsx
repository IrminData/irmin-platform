/**
 * Connection layout skeleton component
 * Matches the structure of ConnectionLayoutWrapper with header and tabs
 */
function ConnectionLayoutSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`
        animate-pulse
        ${className}
      `}
    >
      {/* Connection Header Skeleton */}
      <div className='relative container mx-auto max-w-7xl'>
        <div
          className={`
            mx-auto my-4 flex w-full flex-col px-2
            md:px-4
            lg:flex-row lg:items-center
          `}
        >
          <div className='flex flex-col gap-2 py-4'>
            {/* Connection metadata */}
            <div
              className={`
                flex flex-row items-center divide-x divide-gray-300
                dark:divide-gray-700
              `}
            >
              <div className='flex flex-row items-center gap-2 pr-2'>
                <div
                  className={`
                    h-4 w-20 rounded-sm bg-gray-200
                    dark:bg-gray-800
                  `}
                />
                <div
                  className={`
                    h-5 w-16 rounded-sm bg-gray-200
                    dark:bg-gray-800
                  `}
                />
              </div>
              <div className='px-2'>
                <div
                  className={`
                    h-4 w-48 rounded-sm bg-gray-200
                    dark:bg-gray-800
                  `}
                />
              </div>
            </div>

            {/* Connection title */}
            <div
              className={`
                h-8 w-1/2 rounded-sm bg-gray-200
                dark:bg-gray-800
              `}
            />

            {/* Description */}
            <div
              className={`
                h-4 w-2/3 rounded-sm bg-gray-200
                dark:bg-gray-800
              `}
            />

            {/* Tags */}
            <div className='flex gap-2'>
              <div
                className={`
                  h-5 w-12 rounded-sm bg-gray-200
                  dark:bg-gray-800
                `}
              />
              <div
                className={`
                  h-5 w-16 rounded-sm bg-gray-200
                  dark:bg-gray-800
                `}
              />
              <div
                className={`
                  h-5 w-20 rounded-sm bg-gray-200
                  dark:bg-gray-800
                `}
              />
            </div>
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
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={`tab-${i}`}
                className={`
                  h-10 w-20 rounded-sm bg-gray-200
                  dark:bg-gray-800
                `}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className='relative container mx-auto max-w-7xl py-12'>
        <div className='space-y-4'>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={`content-${i}`} className='space-y-2'>
              <div
                className={`
                  h-6 w-1/4 rounded-sm bg-gray-200
                  dark:bg-gray-800
                `}
              />
              <div
                className={`
                  h-24 rounded-lg bg-gray-200
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

export default ConnectionLayoutSkeleton;
