/**
 * Documentation-specific skeleton component for loading states
 */
function DocumentationSkeleton({
  showHero = true,
  showStats = true,
  showControls = true,
  contentSections = 3,
  className = '',
}: {
  showHero?: boolean;
  showStats?: boolean;
  showControls?: boolean;
  contentSections?: number;
  className?: string;
}) {
  const sectionKeys = Array.from(
    { length: contentSections },
    (_, i) => `doc-skeleton-section-${i}`
  );

  return (
    <div
      className={`
        animate-pulse
        ${className}
      `}
    >
      <div
        className={`
          min-h-screen bg-gradient-to-br from-background via-secondary/20
          to-accent/10
        `}
      >
        <div
          className={`
            container mx-auto max-w-7xl px-4 py-8
            md:px-8
          `}
        >
          {/* Hero Section Skeleton */}
          {showHero && (
            <div className='mb-8'>
              <div
                className={`
                  mb-8 flex flex-col gap-8
                  lg:flex-row lg:items-center lg:justify-between
                `}
              >
                {/* Left side - Title and description */}
                <div className='flex-1'>
                  <div className='mb-6 flex items-center gap-3'>
                    <div
                      className={`
                        size-14 rounded-xl bg-gray-200
                        dark:bg-gray-800
                      `}
                    />
                    <div
                      className={`
                        h-6 w-32 rounded bg-gray-200
                        dark:bg-gray-800
                      `}
                    />
                  </div>
                  <div
                    className={`
                      mb-4 h-12 w-4/5 rounded-lg bg-gray-200
                      dark:bg-gray-800
                    `}
                  />
                  <div
                    className={`
                      mb-8 h-6 w-3/4 rounded bg-gray-200
                      dark:bg-gray-800
                    `}
                  />

                  {/* Action buttons */}
                  <div className='flex gap-4'>
                    <div
                      className={`
                        h-10 w-32 rounded-lg bg-gray-200
                        dark:bg-gray-800
                      `}
                    />
                    <div
                      className={`
                        h-10 w-28 rounded-lg bg-gray-200
                        dark:bg-gray-800
                      `}
                    />
                  </div>
                </div>

                {/* Right side - Stats cards */}
                <div
                  className={`
                    grid grid-cols-2 gap-4
                    lg:min-w-[280px] lg:grid-cols-1
                  `}
                >
                  <div
                    className={`
                      h-20 rounded-xl bg-gray-200
                      dark:bg-gray-800
                    `}
                  />
                  <div
                    className={`
                      h-20 rounded-xl bg-gray-200
                      dark:bg-gray-800
                    `}
                  />
                  <div
                    className={`
                      h-20 rounded-xl bg-gray-200
                      dark:bg-gray-800
                    `}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards Skeleton */}
          {showStats && (
            <div
              className={`
                mb-8 grid grid-cols-2 gap-4
                md:grid-cols-4
              `}
            >
              <div
                className={`
                  h-24 rounded-xl bg-gray-200
                  dark:bg-gray-800
                `}
              />
              <div
                className={`
                  h-24 rounded-xl bg-gray-200
                  dark:bg-gray-800
                `}
              />
              <div
                className={`
                  h-24 rounded-xl bg-gray-200
                  dark:bg-gray-800
                `}
              />
              <div
                className={`
                  h-24 rounded-xl bg-gray-200
                  dark:bg-gray-800
                `}
              />
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
                {/* Navigation pills */}
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
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content Sections Skeleton */}
          <div
            className={`
              grid grid-cols-1 gap-8
              xl:grid-cols-4
            `}
          >
            {/* Main content area */}
            <div className='xl:col-span-3'>
              <div
                className={`
                  rounded-xl bg-gray-200 p-6
                  dark:bg-gray-800
                `}
              >
                {/* Section header */}
                <div className='mb-4 flex items-center gap-2'>
                  <div
                    className={`
                      size-5 rounded bg-gray-300
                      dark:bg-gray-700
                    `}
                  />
                  <div
                    className={`
                      h-6 w-48 rounded bg-gray-300
                      dark:bg-gray-700
                    `}
                  />
                </div>
                <div
                  className={`
                    mb-6 h-4 w-3/4 rounded bg-gray-300
                    dark:bg-gray-700
                  `}
                />

                {/* Content cards */}
                <div className='space-y-6'>
                  {sectionKeys.map((key) => (
                    <div key={key}>
                      <div className='mb-4 flex items-center gap-3'>
                        <div
                          className={`
                            size-6 rounded bg-gray-300
                            dark:bg-gray-700
                          `}
                        />
                        <div
                          className={`
                            h-6 w-32 rounded bg-gray-300
                            dark:bg-gray-700
                          `}
                        />
                        <div
                          className={`
                            h-5 w-16 rounded-full bg-gray-300
                            dark:bg-gray-700
                          `}
                        />
                      </div>

                      <div
                        className={`
                          grid grid-cols-1 gap-4
                          md:grid-cols-2
                        `}
                      >
                        <div
                          className={`
                            h-32 rounded-lg bg-gray-300
                            dark:bg-gray-700
                          `}
                        />
                        <div
                          className={`
                            h-32 rounded-lg bg-gray-300
                            dark:bg-gray-700
                          `}
                        />
                        <div
                          className={`
                            h-32 rounded-lg bg-gray-300
                            dark:bg-gray-700
                          `}
                        />
                        <div
                          className={`
                            h-32 rounded-lg bg-gray-300
                            dark:bg-gray-700
                          `}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Side panel */}
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

                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <div
                      className={`
                        h-4 w-24 rounded bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                    <div
                      className={`
                        h-4 w-full rounded bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                  </div>
                  <div className='space-y-2'>
                    <div
                      className={`
                        h-4 w-24 rounded bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                    <div
                      className={`
                        h-4 w-full rounded bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                  </div>
                  <div className='space-y-2'>
                    <div
                      className={`
                        h-4 w-24 rounded bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                    <div
                      className={`
                        h-4 w-full rounded bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                  </div>
                  <div className='space-y-2'>
                    <div
                      className={`
                        h-4 w-24 rounded bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                    <div
                      className={`
                        h-4 w-full rounded bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                  </div>
                  <div className='space-y-2'>
                    <div
                      className={`
                        h-4 w-24 rounded bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                    <div
                      className={`
                        h-4 w-full rounded bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                  </div>
                  <div className='space-y-2'>
                    <div
                      className={`
                        h-4 w-24 rounded bg-gray-300
                        dark:bg-gray-700
                      `}
                    />
                    <div
                      className={`
                        h-4 w-full rounded bg-gray-300
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

export default DocumentationSkeleton;
