/**
 * Table skeleton component for loading states
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
  const headerKeys = Array.from(
    { length: columns },
    (_, i) => `table-skeleton-header-${i}`
  );
  const rowKeys = Array.from(
    { length: rows },
    (_, i) => `table-skeleton-row-${i}`
  );
  const cellKeys = Array.from(
    { length: rows },
    (_, i) => `table-skeleton-cell-${i}`
  );
  return (
    <div
      className={`
        animate-pulse
        ${className}
      `}
    >
      <div className='overflow-hidden rounded-lg border border-border'>
        {/* Header */}
        {showHeader && (
          <div className='border-b border-border bg-card'>
            <div className='flex'>
              {headerKeys.map((i) => (
                <div key={i} className='flex-1 p-4'>
                  <div
                    className={`
                      h-4 w-3/4 rounded-sm bg-gray-200
                      dark:bg-gray-800
                    `}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rows */}
        <div className='bg-background'>
          {rowKeys.map((rowIndex) => (
            <div
              key={rowIndex}
              className={`
                flex border-b border-border
                last:border-b-0
              `}
            >
              {cellKeys.map((colIndex) => (
                <div key={colIndex} className='flex-1 p-4'>
                  <div
                    className={`
                      h-4 w-full rounded-sm bg-gray-200
                      dark:bg-gray-800
                    `}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
