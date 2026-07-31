import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Generic detail-page skeleton — kept as a backwards-compat fallback
 * for older callers. Prefer a fit-for-purpose skeleton (e.g.
 * `ConnectionLayoutSkeleton`, `AssistantSkeleton`, `EditorLayoutSkeleton`)
 * over this one.
 */
const DetailPageSkeleton = () => {
  return (
    <div className='relative container mx-auto max-w-7xl px-4 py-8'>
      <div
        className={`
          mb-8 flex flex-col gap-4
          lg:flex-row lg:items-center lg:justify-between
        `}
      >
        <div className='flex-1'>
          <LoadingSkeleton
            className='
              mb-2 h-8 w-64
              lg:h-10 lg:w-80
            '
          />
          <div className='space-y-1'>
            <LoadingSkeleton className='h-4 w-96 max-w-full' />
            <LoadingSkeleton className='h-4 w-48' />
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <LoadingSkeleton className='h-10 w-20 rounded-md' />
          <LoadingSkeleton className='h-10 w-24 rounded-md' />
        </div>
      </div>

      <div className='mb-6 border-b border-border'>
        <div className='flex gap-6'>
          <LoadingSkeleton className='h-6 w-16' />
          <LoadingSkeleton className='h-6 w-16' />
          <LoadingSkeleton className='h-6 w-16' />
          <LoadingSkeleton className='h-6 w-16' />
        </div>
      </div>

      <div className='space-y-6'>
        <div
          className={`
            grid grid-cols-1 gap-4
            md:grid-cols-2
            lg:grid-cols-4
          `}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`stat-${i}`}
              className='rounded-lg border border-border bg-card p-4'
            >
              <div className='space-y-2'>
                <LoadingSkeleton className='h-4 w-16' />
                <LoadingSkeleton className='h-8 w-20' />
              </div>
            </div>
          ))}
        </div>

        <div className='rounded-lg border border-border bg-card p-6'>
          <LoadingSkeleton className='mb-4 h-6 w-32' />
          <div className='space-y-2'>
            {Array.from({ length: 6 }).map((_, i) => (
              <LoadingSkeleton key={`line-${i}`} className='h-4 w-full' />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailPageSkeleton;
