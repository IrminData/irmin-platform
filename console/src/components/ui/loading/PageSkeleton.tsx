import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Generic page skeleton — header + content rows, with optional sidebar.
 * Prefer a fit-for-purpose skeleton where one exists.
 */
function PageSkeleton({
  showHeader = true,
  showSidebar = false,
  contentRows = 4,
  className = '',
}: {
  showHeader?: boolean;
  showSidebar?: boolean;
  contentRows?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {showHeader && (
        <div className='mb-6'>
          <LoadingSkeleton className='mb-4 h-8 w-1/3 max-w-sm rounded-md' />
          <LoadingSkeleton className='h-4 w-2/3 max-w-md' />
        </div>
      )}

      <div
        className={`
          flex gap-6
          ${showSidebar ? 'flex-row' : 'flex-col'}
        `}
      >
        {showSidebar && (
          <div className='w-80 shrink-0'>
            <div className='flex flex-col gap-3'>
              <LoadingSkeleton className='h-10 w-full rounded-md' />
              {Array.from({ length: 5 }).map((_, i) => (
                <LoadingSkeleton
                  key={`side-${i}`}
                  className='h-16 w-full rounded-md'
                />
              ))}
            </div>
          </div>
        )}

        <div className='flex-1'>
          <div className='flex flex-col gap-4'>
            {Array.from({ length: contentRows }).map((_, i) => (
              <div key={`content-${i}`} className='flex flex-col gap-2'>
                <LoadingSkeleton className='h-6 w-1/4' />
                <LoadingSkeleton className='h-20 w-full rounded-md' />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PageSkeleton;
