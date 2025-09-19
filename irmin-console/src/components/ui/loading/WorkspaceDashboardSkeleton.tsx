/**
 * Skeleton for workspace home page
 */

// Navigation buttons skeleton
const NavigationButtonsSkeleton = () => (
  <div className='flex flex-row gap-2'>
    <div
      className={`
        h-8 w-20 animate-pulse rounded bg-gray-200
        dark:bg-gray-800
      `}
    />
    <div
      className={`
        h-8 w-16 animate-pulse rounded bg-gray-200
        dark:bg-gray-800
      `}
    />
    <div
      className={`
        h-8 w-24 animate-pulse rounded bg-gray-200
        dark:bg-gray-800
      `}
    />
  </div>
);

// AI Assistant skeleton
const AssistantSkeleton = () => (
  <div className={`w-full overflow-hidden rounded-lg bg-card`}>
    <div className='p-4'>
      <div className='mb-4 flex items-center justify-between'>
        <div
          className={`
            h-5 w-32 animate-pulse rounded bg-gray-200
            dark:bg-gray-800
          `}
        />
        <div
          className={`
            size-8 animate-pulse rounded bg-gray-200
            dark:bg-gray-800
          `}
        />
      </div>
      <div className='space-y-3'>
        <div
          className={`
            h-4 w-full animate-pulse rounded bg-gray-200
            dark:bg-gray-800
          `}
        />
        <div
          className={`
            h-4 w-3/4 animate-pulse rounded bg-gray-200
            dark:bg-gray-800
          `}
        />
        <div
          className={`
            h-4 w-1/2 animate-pulse rounded bg-gray-200
            dark:bg-gray-800
          `}
        />
      </div>
      <div
        className={`
          mt-4 h-10 w-full animate-pulse rounded bg-gray-200
          dark:bg-gray-800
        `}
      />
    </div>
  </div>
);

// Workflow runs feed skeleton
const WorkflowRunsFeedSkeleton = () => (
  <div className='flex w-full flex-col rounded-lg bg-card'>
    <div className='p-4'>
      <div className='mb-4 flex items-center justify-between'>
        <div
          className={`
            h-5 w-24 animate-pulse rounded bg-gray-200
            dark:bg-gray-800
          `}
        />
        <div
          className={`
            h-6 w-16 animate-pulse rounded bg-gray-200
            dark:bg-gray-800
          `}
        />
      </div>
      <div className='space-y-2'>
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={`workflow-run-skeleton-${index}`}
            className='rounded-lg p-2'
          >
            <div className='mb-1 flex items-center gap-2'>
              <div
                className={`
                  h-3 w-20 animate-pulse rounded bg-gray-200
                  dark:bg-gray-800
                `}
              />
              <div
                className={`
                  h-4 w-12 animate-pulse rounded bg-gray-200
                  dark:bg-gray-800
                `}
              />
            </div>
            <div className='flex items-center gap-2'>
              <div
                className={`
                  h-3 w-16 animate-pulse rounded bg-gray-200
                  dark:bg-gray-800
                `}
              />
              <div
                className={`
                  h-3 w-12 animate-pulse rounded bg-gray-200
                  dark:bg-gray-800
                `}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// List card skeleton
const ListCardSkeleton = () => (
  <div className='rounded-lg bg-card'>
    <div className='p-4'>
      <div className='mb-4 flex items-center justify-between'>
        <div
          className={`
            h-5 w-24 animate-pulse rounded bg-gray-200
            dark:bg-gray-800
          `}
        />
        <div
          className={`
            h-6 w-16 animate-pulse rounded bg-gray-200
            dark:bg-gray-800
          `}
        />
      </div>
      <div className='space-y-2'>
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={`list-item-skeleton-${index}`}
            className={`flex items-center justify-between rounded p-2`}
          >
            <div className='flex items-center gap-2'>
              <div
                className={`
                  size-4 animate-pulse rounded bg-gray-200
                  dark:bg-gray-800
                `}
              />
              <div
                className={`
                  h-4 w-20 animate-pulse rounded bg-gray-200
                  dark:bg-gray-800
                `}
              />
            </div>
            <div
              className={`
                h-4 w-12 animate-pulse rounded bg-gray-200
                dark:bg-gray-800
              `}
            />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const WorkspaceDashboardSkeleton = () => {
  return (
    <div className='pattern-bg h-full py-12'>
      <div
        className={`
          relative container mx-auto max-w-7xl
          lg:px-4
        `}
      >
        <div className='flex flex-col gap-4 px-4 pb-12'>
          {/* Navigation Buttons */}
          <NavigationButtonsSkeleton />

          {/* AI Assistant and Workflow Runs */}
          <div
            className={`
              flex flex-col gap-4
              lg:flex-row
            `}
          >
            <AssistantSkeleton />
            <WorkflowRunsFeedSkeleton />
          </div>

          {/* List cards */}
          <div
            className={`
              grid grid-cols-1 gap-4
              lg:grid-cols-3
            `}
          >
            <ListCardSkeleton />
            <ListCardSkeleton />
            <ListCardSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceDashboardSkeleton;
