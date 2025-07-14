/**
 * Skeleton for workspace home page
 */
const SkeletonCard = () => (
  <div
    className={`
      flex w-96 max-w-full animate-pulse flex-col items-center justify-center
      gap-4 rounded-lg border-2 border-transparent bg-card p-4 text-center
      text-card-foreground
      md:p-6 md:py-8
    `}
  >
    <div
      className={`
        aspect-square h-16 w-16 rounded-full bg-gray-200
        lg:h-20 lg:w-20
        dark:bg-gray-800
      `}
    />
    <div
      className={`
        h-6 w-32 rounded bg-gray-200
        lg:h-7 lg:w-40
        dark:bg-gray-800
      `}
    />
    <div className='space-y-2'>
      <div
        className={`
          h-4 w-48 rounded bg-gray-200
          lg:h-5 lg:w-56
          dark:bg-gray-800
        `}
      />
      <div
        className={`
          h-4 w-32 rounded bg-gray-200
          lg:h-5 lg:w-40
          dark:bg-gray-800
        `}
      />
    </div>
  </div>
);

const WorkspaceHomeSkeleton = () => {
  return (
    <div className='pattern-bg h-full py-12'>
      <div className='relative container mx-auto max-w-6xl px-4'>
        <div className='flex flex-col gap-8 px-4'>
          {/* Title section */}
          <div className='flex w-full flex-col gap-4'>
            <div className='mx-auto w-1/2 max-w-80'>
              <div
                className={`
                  mx-auto h-14 w-full animate-pulse rounded bg-gray-200
                  dark:bg-gray-800
                `}
              />
            </div>
            <div
              className={`
                mx-auto h-4 w-64 animate-pulse rounded bg-gray-200
                dark:bg-gray-800
              `}
            />
          </div>

          {/* Cards grid */}
          <div
            className={`flex w-full flex-wrap items-center justify-center gap-8`}
          >
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceHomeSkeleton;
