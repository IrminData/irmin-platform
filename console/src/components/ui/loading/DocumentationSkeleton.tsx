import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Mirror skeleton for `DocumentationSection` — hero (icon + eyebrow
 * + title + intro + search controls), Summary section (stats card
 * with grid of number/label pairs), then N content sections each
 * with a section header and a 2-column grid of resource cards.
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
  return (
    <div className={className}>
      <div className='min-h-screen bg-background text-foreground'>
        <div className='container mx-auto max-w-6xl px-4 py-12'>
          {showHero && (
            <div className='mb-10 flex flex-col gap-6'>
              <div className='flex items-center gap-3'>
                <LoadingSkeleton className='size-10 rounded-lg' />
                <LoadingSkeleton className='h-6 w-24' />
              </div>
              <LoadingSkeleton className='h-10 w-3/4 max-w-xl' />
              <LoadingSkeleton className='h-5 w-1/2 max-w-md' />
              {showControls && (
                <div className='flex flex-wrap items-center gap-4'>
                  <LoadingSkeleton className='h-10 w-32 rounded-md' />
                  <LoadingSkeleton className='h-10 w-72 max-w-full rounded-md' />
                </div>
              )}
            </div>
          )}

          {showStats && (
            <section className='mb-12 space-y-6'>
              <LoadingSkeleton className='h-8 w-48' />
              <div className='rounded-lg border border-border bg-card p-6'>
                <LoadingSkeleton className='mb-4 h-6 w-32' />
                <div
                  className={`
                    grid grid-cols-1 gap-4 text-sm
                    sm:grid-cols-2
                    lg:grid-cols-3
                  `}
                >
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={`stat-${i}`} className='space-y-1'>
                      <LoadingSkeleton className='h-4 w-24' />
                      <LoadingSkeleton className='h-6 w-12' />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <div className='space-y-12'>
            {Array.from({ length: contentSections }).map((_, sectionIndex) => (
              <section key={`section-${sectionIndex}`} className='space-y-6'>
                <div className='flex items-center gap-3'>
                  <LoadingSkeleton className='size-10 rounded-lg' />
                  <div className='space-y-2'>
                    <LoadingSkeleton className='h-8 w-48' />
                    <LoadingSkeleton className='h-4 w-64' />
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
                      key={`card-${sectionIndex}-${cardIndex}`}
                      className='rounded-lg border border-border bg-card p-6'
                    >
                      <LoadingSkeleton className='mb-2 h-6 w-3/4' />
                      <LoadingSkeleton className='mb-4 h-4 w-full' />
                      <div className='space-y-3'>
                        {Array.from({ length: 3 }).map((_, itemIndex) => (
                          <div
                            key={`item-${sectionIndex}-${cardIndex}-${itemIndex}`}
                            className='space-y-1'
                          >
                            <LoadingSkeleton className='h-3 w-20' />
                            <LoadingSkeleton className='h-4 w-32' />
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
