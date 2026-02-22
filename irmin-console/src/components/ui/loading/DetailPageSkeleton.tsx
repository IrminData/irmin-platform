const TabSkeleton = () => {
  return (
    <div
      className={`
        h-6 w-16 animate-pulse rounded-sm bg-gray-200
        dark:bg-gray-800
      `}
    />
  );
};

const StatCardSkeleton = () => {
  return (
    <div className='rounded-lg border bg-card p-4'>
      <div className='space-y-2'>
        <div
          className={`
            h-4 w-16 animate-pulse rounded-sm bg-gray-200
            dark:bg-gray-800
          `}
        />
        <div
          className={`
            h-8 w-20 animate-pulse rounded-sm bg-gray-200
            dark:bg-gray-800
          `}
        />
      </div>
    </div>
  );
};

const ContentLineSkeleton = () => {
  return (
    <div
      className={`
        h-4 animate-pulse rounded-sm bg-gray-200
        dark:bg-gray-800
      `}
    />
  );
};

/**
 * Skeleton for detail pages (repository, workflow, etc.)
 */
const DetailPageSkeleton = () => {
  return (
    <div className='relative container mx-auto max-w-7xl px-4 py-8'>
      {/* Header section */}
      <div
        className={`
          mb-8 flex flex-col gap-4
          lg:flex-row lg:items-center lg:justify-between
        `}
      >
        <div className='flex-1'>
          {/* Title */}
          <div
            className={`
              mb-2 h-8 w-64 animate-pulse rounded-sm bg-gray-200
              lg:h-10 lg:w-80
              dark:bg-gray-800
            `}
          />

          {/* Subtitle/description */}
          <div className='space-y-1'>
            <div
              className={`
                h-4 w-96 animate-pulse rounded-sm bg-gray-200
                dark:bg-gray-800
              `}
            />
            <div
              className={`
                h-4 w-48 animate-pulse rounded-sm bg-gray-200
                dark:bg-gray-800
              `}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className='flex items-center gap-2'>
          <div
            className={`
              h-10 w-20 animate-pulse rounded-sm bg-gray-200
              dark:bg-gray-800
            `}
          />
          <div
            className={`
              h-10 w-24 animate-pulse rounded-sm bg-gray-200
              dark:bg-gray-800
            `}
          />
        </div>
      </div>

      {/* Navigation tabs */}
      <div
        className={`
          mb-6 border-b border-gray-200
          dark:border-gray-800
        `}
      >
        <div className='flex gap-6'>
          <TabSkeleton />
          <TabSkeleton />
          <TabSkeleton />
          <TabSkeleton />
        </div>
      </div>

      {/* Main content area */}
      <div className='space-y-6'>
        {/* Stats/info cards */}
        <div
          className={`
            grid grid-cols-1 gap-4
            md:grid-cols-2
            lg:grid-cols-4
          `}
        >
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Main content block */}
        <div className='rounded-lg border bg-card p-6'>
          <div className='space-y-4'>
            <div
              className={`
                h-6 w-32 animate-pulse rounded-sm bg-gray-200
                dark:bg-gray-800
              `}
            />
            <div className='space-y-2'>
              <ContentLineSkeleton />
              <ContentLineSkeleton />
              <ContentLineSkeleton />
              <ContentLineSkeleton />
              <ContentLineSkeleton />
              <ContentLineSkeleton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailPageSkeleton;
