import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Mirror skeleton for the 3-column editor layout used by
 * `QueriesSection` and `ScriptsSection`: left list sidebar,
 * center editor, right details sidebar. Stacks to 3 rows on
 * mobile in the same `order-{1,2,3}` as the real component.
 */
const EditorLayoutSkeleton = ({
  showDetails = true,
}: {
  showDetails?: boolean;
}) => {
  return (
    <div className='flex size-full flex-col bg-background'>
      <div
        className={`
          flex flex-1 flex-col overflow-hidden
          lg:flex-row
        `}
      >
        {/* Left sidebar — list of saved queries/scripts */}
        <div
          className={`
            order-3 flex min-h-80 w-full flex-col border-t border-border
            lg:order-1 lg:w-80 lg:shrink-0 lg:border-0 lg:border-r
          `}
        >
          <div className='flex flex-col gap-2 p-2'>
            <LoadingSkeleton className='h-9 w-full rounded-md' />
            <LoadingSkeleton className='h-9 w-full rounded-md' />
          </div>
          <div className='border-b border-border p-2'>
            <LoadingSkeleton className='h-9 w-full rounded-md' />
          </div>
          <div className='flex flex-col gap-2 p-2'>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`list-${i}`}
                className='flex flex-col gap-1 rounded-md p-2'
              >
                <LoadingSkeleton className='h-4 w-3/4' />
                <LoadingSkeleton className='h-3 w-1/2' />
              </div>
            ))}
          </div>
        </div>

        {/* Center — editor + results */}
        <div
          className={`
            order-1 flex min-h-80 w-full flex-col overflow-hidden
            lg:order-2 lg:min-w-0 lg:grow
          `}
        >
          <div
            className={`
              flex items-center justify-between border-b border-border p-3
            `}
          >
            <LoadingSkeleton className='h-5 w-48' />
            <div className='flex items-center gap-2'>
              <LoadingSkeleton className='h-8 w-20 rounded-md' />
              <LoadingSkeleton className='h-8 w-24 rounded-md' />
            </div>
          </div>
          {/* Code editor area */}
          <div className='flex min-h-0 flex-1 flex-col p-2'>
            <LoadingSkeleton className='size-full min-h-64 rounded-md' />
          </div>
          {/* Results panel */}
          <div className='border-t border-border p-2'>
            <LoadingSkeleton className='mb-2 h-4 w-32' />
            <LoadingSkeleton className='h-24 w-full rounded-md' />
          </div>
        </div>

        {/* Right sidebar — details of selected query/script */}
        {showDetails && (
          <div
            className={`
              order-2 hidden w-full border-t border-border p-4
              lg:order-3 lg:block lg:w-80 lg:min-w-80 lg:shrink-0 lg:border-0
              lg:border-l
            `}
          >
            <LoadingSkeleton className='mb-2 h-5 w-24 rounded-full' />
            <LoadingSkeleton className='mb-1 h-5 w-40' />
            <LoadingSkeleton className='mb-4 h-3 w-2/3' />
            <div className='flex flex-col gap-2'>
              <LoadingSkeleton className='h-9 w-full rounded-md' />
              <LoadingSkeleton className='h-9 w-full rounded-md' />
              <LoadingSkeleton className='h-9 w-full rounded-md' />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorLayoutSkeleton;
