import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Generic table skeleton — M × N cells. Prefer `ListShellSkeleton`
 * (byte-identical to `<CardOrNormalList loading>`) for the normal
 * list/table surfaces.
 */
export const TableSkeleton = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  className = '',
}: {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}) => {
  return (
    <div className={className}>
      <div className='overflow-hidden rounded-lg border border-border'>
        {showHeader && (
          <div className='border-b border-border bg-card'>
            <div className='flex'>
              {Array.from({ length: columns }).map((_, i) => (
                <div key={`h-${i}`} className='flex-1 p-4'>
                  <LoadingSkeleton className='h-4 w-3/4' />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className='bg-background'>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={`r-${rowIndex}`}
              className={`
                flex border-b border-border
                last:border-b-0
              `}
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div key={`r-${rowIndex}-c-${colIndex}`} className='flex-1 p-4'>
                  <LoadingSkeleton className='h-4 w-full' />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
