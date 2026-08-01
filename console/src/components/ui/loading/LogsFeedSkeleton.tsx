import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Mirror skeleton for `LogsSection` — title row (back button + title
 * + inline filter chips), search bar, and a feed of log rows
 * (timestamp + level badge + message).
 */
const LogsFeedSkeleton = ({
  rowCount = 10,
  showFilters = true,
}: {
  rowCount?: number;
  showFilters?: boolean;
}) => {
  return (
    <div className='relative container mx-auto max-w-7xl'>
      <div
        className='
          flex flex-col gap-8 px-2 py-12
          md:px-4
        '
      >
        <div className='flex items-center gap-8'>
          <LoadingSkeleton className='size-10 rounded-full' />
          <LoadingSkeleton className='h-9 w-56' />
        </div>

        {showFilters && (
          <div className='flex flex-wrap items-center gap-2'>
            <LoadingSkeleton className='h-9 w-32 rounded-md' />
            <LoadingSkeleton className='h-9 w-36 rounded-md' />
            <LoadingSkeleton className='h-9 w-28 rounded-md' />
          </div>
        )}

        <LoadingSkeleton className='h-11 w-full rounded-md' />

        <div className='flex flex-col gap-2'>
          {Array.from({ length: rowCount }).map((_, i) => (
            <div
              key={`log-${i}`}
              className={`
                flex items-center gap-3 rounded-md border border-border p-3
              `}
            >
              <LoadingSkeleton className='h-4 w-28 shrink-0' />
              <LoadingSkeleton className='h-5 w-16 shrink-0 rounded-full' />
              <LoadingSkeleton className='h-4 w-full' />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LogsFeedSkeleton;
