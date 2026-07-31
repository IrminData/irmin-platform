import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Mirror skeleton for `DocumentationSchemaSection`.
 *
 * Hero (icon + title + description + search + PDF button),
 * "Data Flows" section (list of workflow cards — badge, status,
 * owner row, tags row, node flow), "Component Directory" section
 * (grid of repository cards + connections card).
 */
function SchemaSkeleton({
  showHeader = true,
  showControls = true,
  dataFlowCount = 3,
  className = '',
}: {
  showHeader?: boolean;
  showControls?: boolean;
  dataFlowCount?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className='min-h-screen bg-background text-foreground'>
        <div className='container mx-auto max-w-6xl px-4 py-12'>
          {showHeader && (
            <div className='mb-10 flex flex-col gap-6'>
              <div className='flex items-center gap-3'>
                <LoadingSkeleton className='size-10 rounded-lg' />
                <LoadingSkeleton className='h-9 w-48' />
              </div>
              <LoadingSkeleton className='h-4 w-2/3 max-w-3xl' />
              {showControls && (
                <div className='flex flex-wrap items-center gap-4'>
                  <LoadingSkeleton className='h-10 w-80 max-w-full rounded-md' />
                  <LoadingSkeleton className='h-10 w-32 rounded-md' />
                </div>
              )}
            </div>
          )}

          <div className='space-y-12'>
            {/* Data Flows */}
            <section className='mb-12 space-y-6'>
              <LoadingSkeleton className='h-8 w-48' />
              <div className='space-y-6'>
                {Array.from({ length: dataFlowCount }).map((_, i) => (
                  <div
                    key={`flow-${i}`}
                    className='rounded-lg border border-border bg-card p-6'
                  >
                    <div className='mb-4 flex flex-wrap items-center gap-3'>
                      <LoadingSkeleton className='h-7 w-56' />
                      <LoadingSkeleton className='h-6 w-20 rounded-full' />
                      <LoadingSkeleton className='h-6 w-16 rounded-full' />
                    </div>
                    <LoadingSkeleton className='mb-4 h-4 w-3/4' />
                    <LoadingSkeleton className='mb-2 h-3 w-16' />
                    <div className='flex flex-wrap items-center gap-2'>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <LoadingSkeleton
                          key={`flow-${i}-node-${j}`}
                          className='h-8 w-32 rounded-md'
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Component Directory */}
            <section className='space-y-6'>
              <LoadingSkeleton className='h-8 w-64' />
              <div
                className={`
                  grid grid-cols-1 gap-6
                  lg:grid-cols-2
                `}
              >
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={`component-${i}`}
                    className='rounded-lg border border-border bg-card p-6'
                  >
                    <div className='mb-4 flex items-center gap-2'>
                      <LoadingSkeleton className='size-5' />
                      <LoadingSkeleton className='h-6 w-32' />
                    </div>
                    <div className='space-y-4'>
                      {Array.from({ length: 4 }).map((_, j) => (
                        <div
                          key={`component-${i}-item-${j}`}
                          className={`
                            space-y-1 border-b border-border pb-3
                            last:border-b-0 last:pb-0
                          `}
                        >
                          <LoadingSkeleton className='h-5 w-3/4' />
                          <LoadingSkeleton className='h-3 w-full' />
                          <LoadingSkeleton className='h-3 w-2/3' />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SchemaSkeleton;
