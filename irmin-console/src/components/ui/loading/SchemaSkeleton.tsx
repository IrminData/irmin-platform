function StatisticsCardSkeleton() {
  return (
    <div
      className={`
        rounded-xl bg-gray-200 p-4
        dark:bg-gray-800
      `}
    >
      <div className='flex items-center justify-between'>
        <div className='space-y-2'>
          <div
            className={`
              h-4 w-20 rounded bg-gray-300
              dark:bg-gray-700
            `}
          />
          <div
            className={`
              h-6 w-12 rounded bg-gray-300
              dark:bg-gray-700
            `}
          />
        </div>
        <div
          className={`
            size-8 rounded bg-gray-300
            dark:bg-gray-700
          `}
        />
      </div>
    </div>
  );
}

/**
 * Schema part skeleton component for loading states
 */
function SchemaPartSkeleton() {
  return (
    <div className='flex justify-between'>
      <div
        className={`
          h-4 w-20 rounded bg-gray-300
          dark:bg-gray-700
        `}
      />
      <div
        className={`
          h-4 w-8 rounded bg-gray-300
          dark:bg-gray-700
        `}
      />
    </div>
  );
}

/**
 * Schema-specific skeleton component for loading states
 */
function SchemaSkeleton({
  showHeader = true,
  showStats = true,
  showControls = true,
  showVisualization = true,
  className = '',
}: {
  showHeader?: boolean;
  showStats?: boolean;
  showControls?: boolean;
  showVisualization?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`
        animate-pulse
        ${className}
      `}
    >
      <div
        className={`
          min-h-screen bg-linear-to-br from-background via-secondary/20
          to-accent/10
        `}
      >
        <div
          className={`
            container mx-auto max-w-7xl px-4 py-8
            md:px-8
          `}
        >
          {/* Header Skeleton */}
          {showHeader && (
            <div className='mb-8'>
              <div className='mb-4 flex items-center gap-3'>
                <div
                  className={`
                    size-14 rounded-xl bg-gray-200
                    dark:bg-gray-800
                  `}
                />
                <div>
                  <div
                    className={`
                      mb-2 h-8 w-48 rounded-lg bg-gray-200
                      dark:bg-gray-800
                    `}
                  />
                  <div
                    className={`
                      h-5 w-80 rounded bg-gray-200
                      dark:bg-gray-800
                    `}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Statistics Cards Skeleton */}
          {showStats && (
            <div
              className={`
                mb-8 grid grid-cols-2 gap-4
                md:grid-cols-4
              `}
            >
              <StatisticsCardSkeleton />
              <StatisticsCardSkeleton />
              <StatisticsCardSkeleton />
              <StatisticsCardSkeleton />
            </div>
          )}

          {/* Controls Skeleton */}
          {showControls && (
            <div
              className={`
                mb-8 rounded-2xl bg-gray-200 p-6
                dark:bg-gray-800
              `}
            >
              <div
                className={`
                  flex flex-col gap-6
                  lg:flex-row lg:items-center lg:justify-between
                `}
              >
                {/* View mode toggles */}
                <div className='flex items-center gap-2'>
                  <div
                    className={`
                      h-8 w-28 rounded-lg bg-gray-300
                      dark:bg-gray-700
                    `}
                  />
                  <div
                    className={`
                      h-8 w-28 rounded-lg bg-gray-300
                      dark:bg-gray-700
                    `}
                  />
                  <div
                    className={`
                      h-8 w-28 rounded-lg bg-gray-300
                      dark:bg-gray-700
                    `}
                  />
                </div>

                {/* Search and filters */}
                <div className='flex items-center gap-4'>
                  <div
                    className={`
                      h-10 w-64 rounded-lg bg-gray-300
                      dark:bg-gray-700
                    `}
                  />
                  <div className='flex gap-2'>
                    <div
                      className={`
                        h-8 w-20 rounded-lg bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                    <div
                      className={`
                        h-8 w-20 rounded-lg bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                    <div
                      className={`
                        h-8 w-20 rounded-lg bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                    <div
                      className={`
                        h-8 w-20 rounded-lg bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                  </div>
                  <div className='flex gap-2'>
                    <div
                      className={`
                        h-8 w-24 rounded-lg bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                    <div
                      className={`
                        h-8 w-24 rounded-lg bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div
            className={`
              grid grid-cols-1 gap-8
              xl:grid-cols-4
            `}
          >
            {/* Visualization Area */}
            <div className='xl:col-span-3'>
              <div
                className={`
                  rounded-xl bg-gray-200
                  dark:bg-gray-800
                `}
              >
                <div
                  className={`
                    border-b border-gray-300 p-6
                    dark:border-gray-700
                  `}
                >
                  <div className='mb-2 flex items-center gap-2'>
                    <div
                      className={`
                        size-5 rounded bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                    <div
                      className={`
                        h-6 w-40 rounded bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                  </div>
                  <div
                    className={`
                      h-4 w-3/4 rounded bg-gray-300
                      dark:bg-gray-700
                    `}
                  />
                </div>

                {showVisualization && (
                  <div className='p-6'>
                    {/* Flow chart visualization skeleton */}
                    <div className='relative h-[calc(100vh-400px)]'>
                      {/* Nodes */}
                      <div className='absolute top-8 left-8'>
                        <div
                          className={`
                            h-16 w-48 rounded-lg bg-gray-300
                            dark:bg-gray-700
                          `}
                        />
                      </div>
                      <div className='absolute top-8 left-80'>
                        <div
                          className={`
                            h-16 w-48 rounded-lg bg-gray-300
                            dark:bg-gray-700
                          `}
                        />
                      </div>
                      <div className='absolute top-32 left-20'>
                        <div
                          className={`
                            h-16 w-48 rounded-lg bg-gray-300
                            dark:bg-gray-700
                          `}
                        />
                      </div>
                      <div className='absolute top-32 left-96'>
                        <div
                          className={`
                            h-16 w-48 rounded-lg bg-gray-300
                            dark:bg-gray-700
                          `}
                        />
                      </div>
                      <div className='absolute top-56 left-8'>
                        <div
                          className={`
                            h-16 w-48 rounded-lg bg-gray-300
                            dark:bg-gray-700
                          `}
                        />
                      </div>
                      <div className='absolute top-56 left-80'>
                        <div
                          className={`
                            h-16 w-48 rounded-lg bg-gray-300
                            dark:bg-gray-700
                          `}
                        />
                      </div>

                      {/* Control panel */}
                      <div className='absolute bottom-4 left-4'>
                        <div
                          className={`
                            h-24 w-32 rounded-lg bg-gray-300
                            dark:bg-gray-700
                          `}
                        />
                      </div>

                      {/* Minimap */}
                      <div className='absolute right-4 bottom-4'>
                        <div
                          className={`
                            h-32 w-48 rounded-lg bg-gray-300
                            dark:bg-gray-700
                          `}
                        />
                      </div>

                      {/* Legend */}
                      <div className='absolute top-4 right-4'>
                        <div
                          className={`
                            h-48 w-40 rounded-lg bg-gray-300
                            dark:bg-gray-700
                          `}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Side Panel */}
            <div className='xl:col-span-1'>
              <div
                className={`
                  rounded-xl bg-gray-200 p-6
                  dark:bg-gray-800
                `}
              >
                <div className='mb-4 flex items-center gap-2'>
                  <div
                    className={`
                      size-5 rounded bg-gray-300
                      dark:bg-gray-700
                    `}
                  />
                  <div
                    className={`
                      h-6 w-32 rounded bg-gray-300
                      dark:bg-gray-700
                    `}
                  />
                </div>

                <div className='space-y-6'>
                  {/* Component info section */}
                  <div className='space-y-4'>
                    <div
                      className={`
                        h-4 w-24 rounded bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                    <SchemaPartSkeleton />
                    <SchemaPartSkeleton />
                    <SchemaPartSkeleton />
                    <SchemaPartSkeleton />
                  </div>

                  {/* Workflow types section */}
                  <div className='space-y-4'>
                    <div
                      className={`
                        h-4 w-24 rounded bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                    <SchemaPartSkeleton />
                    <SchemaPartSkeleton />
                    <SchemaPartSkeleton />
                    <SchemaPartSkeleton />
                  </div>

                  {/* Help text */}
                  <div
                    className={`
                      border-t border-gray-300 pt-4
                      dark:border-gray-700
                    `}
                  >
                    <div
                      className={`
                        h-8 w-full rounded bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SchemaSkeleton;
