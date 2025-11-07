/**
 * Schema-specific skeleton component for loading states
 */
function SchemaSkeleton({
  showHeader = true,
  showStats = false,
  showControls = false,
  showVisualization = false,
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
      <div className='min-h-screen bg-background text-foreground'>
        <div className='container mx-auto max-w-6xl px-4 py-12'>
          {/* Header Section */}
          {showHeader && (
            <div className='mb-10 flex flex-col gap-6'>
              <div className='flex items-center gap-3'>
                <div className='size-10 rounded-lg bg-muted' />
                <div className='h-9 w-48 rounded bg-muted' />
              </div>
              <div className='h-5 w-2/3 rounded bg-muted' />
              <div
                className={`
                  relative h-10 w-full max-w-80 rounded-lg bg-muted
                  sm:w-80
                `}
              />
            </div>
          )}

          {/* Stats Section */}
          {showStats && (
            <section className='mb-12 space-y-6'>
              <div className='h-8 w-48 rounded bg-muted' />
              <div
                className={`
                  grid grid-cols-2 gap-4
                  md:grid-cols-4
                `}
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={i} className='rounded-lg border bg-card p-4'>
                    <div className='mb-2 h-4 w-20 rounded bg-muted' />
                    <div className='h-6 w-12 rounded bg-muted' />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Controls Section */}
          {showControls && (
            <div className='mb-8 rounded-lg border bg-card p-6'>
              <div
                className={`
                  flex flex-col gap-6
                  lg:flex-row lg:items-center lg:justify-between
                `}
              >
                <div className='flex gap-2'>
                  {Array.from({ length: 3 }).map((_, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <div key={i} className='h-8 w-28 rounded-lg bg-muted' />
                  ))}
                </div>
                <div className='flex items-center gap-4'>
                  <div className='h-10 w-64 rounded-lg bg-muted' />
                  <div className='flex gap-2'>
                    {Array.from({ length: 4 }).map((_, i) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <div key={i} className='h-8 w-20 rounded-lg bg-muted' />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <section className='mb-12 space-y-6'>
            <div className='h-8 w-48 rounded bg-muted' />
            <div className='space-y-6'>
              {Array.from({ length: 3 }).map((_, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <div key={i} className='rounded-lg border bg-card p-6'>
                  <div className='mb-4 flex flex-wrap items-center gap-3'>
                    <div className='h-7 w-48 rounded bg-muted' />
                    <div className='h-6 w-20 rounded-full bg-muted' />
                    <div className='h-6 w-16 rounded-full bg-muted' />
                  </div>
                  <div className='mb-4 h-4 w-3/4 rounded bg-muted' />
                  <div className='mb-2 h-3 w-16 rounded bg-muted' />
                  <div className='flex flex-wrap items-center gap-2'>
                    {Array.from({ length: 4 }).map((_, j) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <div key={j} className='h-8 w-32 rounded-md bg-muted' />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Component Directory */}
          <section className='space-y-6'>
            <div className='h-8 w-64 rounded bg-muted' />
            <div
              className={`
                grid grid-cols-1 gap-6
                md:grid-cols-2
              `}
            >
              {Array.from({ length: 2 }).map((_, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <div key={i} className='rounded-lg border bg-card p-6'>
                  <div className='mb-4 flex items-center gap-2'>
                    <div className='size-5 rounded bg-muted' />
                    <div className='h-6 w-32 rounded bg-muted' />
                  </div>
                  <div className='space-y-4'>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div
                        // eslint-disable-next-line react/no-array-index-key
                        key={j}
                        className={`
                          space-y-1 border-b pb-3
                          last:border-b-0 last:pb-0
                        `}
                      >
                        <div className='h-5 w-3/4 rounded bg-muted' />
                        <div className='h-3 w-full rounded bg-muted' />
                        <div className='h-3 w-2/3 rounded bg-muted' />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Visualization Area */}
          {showVisualization && (
            <div className='mt-12 rounded-lg border bg-card p-6'>
              <div className='mb-4 flex items-center gap-2'>
                <div className='size-5 rounded bg-muted' />
                <div className='h-6 w-40 rounded bg-muted' />
              </div>
              <div className='h-[400px] rounded bg-muted' />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SchemaSkeleton;
