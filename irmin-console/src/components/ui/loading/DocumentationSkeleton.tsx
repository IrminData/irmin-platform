/**
 * Documentation-specific skeleton component for loading states
 */
function DocumentationSkeleton({
  showHero = true,
  showStats = true,
  showControls = false,
  contentSections = 3,
  className = '',
}: {
  showHero?: boolean;
  showStats?: boolean;
  showControls?: boolean;
  contentSections?: number;
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
          {showHero && (
            <div className='mb-10 flex flex-col gap-6'>
              <div className='flex items-center gap-3'>
                <div className='size-10 rounded-lg bg-muted' />
                <div className='h-6 w-24 rounded bg-muted' />
              </div>
              <div className='h-10 w-3/4 rounded bg-muted' />
              <div className='h-5 w-1/2 rounded bg-muted' />
              {showControls && (
                <div className='flex flex-wrap items-center gap-4'>
                  <div className='h-10 w-32 rounded-lg bg-muted' />
                  <div className='h-10 w-72 rounded-lg bg-muted' />
                </div>
              )}
            </div>
          )}

          {/* Stats Section */}
          {showStats && (
            <section className='mb-12 space-y-6'>
              <div className='h-8 w-48 rounded bg-muted' />
              <div className='rounded-lg border bg-card p-6'>
                <div className='mb-4 h-6 w-32 rounded bg-muted' />
                <div
                  className={`
                    grid grid-cols-1 gap-4 text-sm
                    sm:grid-cols-2
                    lg:grid-cols-3
                  `}
                >
                  {Array.from({ length: 9 }).map((_, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <div key={i} className='space-y-1'>
                      <div className='h-4 w-24 rounded bg-muted' />
                      <div className='h-6 w-12 rounded bg-muted' />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Content Sections */}
          <div className='space-y-12'>
            {Array.from({ length: contentSections }).map((_, sectionIndex) => (
              // eslint-disable-next-line react/no-array-index-key
              <section key={sectionIndex} className='space-y-6'>
                <div className='flex items-center gap-3'>
                  <div className='size-10 rounded-lg bg-muted' />
                  <div className='space-y-2'>
                    <div className='h-8 w-48 rounded bg-muted' />
                    <div className='h-4 w-64 rounded bg-muted' />
                  </div>
                </div>
                <div
                  className={`
                    grid grid-cols-1 gap-6
                    lg:grid-cols-2
                  `}
                >
                  {Array.from({ length: 4 }).map((_, cardIndex) => (
                    <div
                      // eslint-disable-next-line react/no-array-index-key
                      key={cardIndex}
                      className='rounded-lg border bg-card p-6'
                    >
                      <div className='mb-2 h-6 w-3/4 rounded bg-muted' />
                      <div className='mb-4 h-4 w-full rounded bg-muted' />
                      <div className='space-y-3'>
                        {Array.from({ length: 3 }).map((_, itemIndex) => (
                          // eslint-disable-next-line react/no-array-index-key
                          <div key={itemIndex} className='space-y-1'>
                            <div className='h-3 w-20 rounded bg-muted' />
                            <div className='h-4 w-32 rounded bg-muted' />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentationSkeleton;
