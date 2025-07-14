/**
 * Page-level skeleton component for loading states
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
  const sidebarKeys = Array.from(
    { length: 5 },
    (_, i) => `page-skeleton-sidebar-${i}`
  );
  const contentKeys = Array.from(
    { length: contentRows },
    (_, i) => `page-skeleton-content-${i}`
  );

  return (
    <div
      className={`
        animate-pulse
        ${className}
      `}
    >
      {/* Header */}
      {showHeader && (
        <div className='mb-6'>
          <div
            className={`
              mb-4 h-8 w-1/3 rounded-lg bg-gray-200
              dark:bg-gray-800
            `}
          />
          <div
            className={`
              h-4 w-2/3 rounded bg-gray-200
              dark:bg-gray-800
            `}
          />
        </div>
      )}

      <div
        className={`
          flex gap-6
          ${showSidebar ? 'flex-row' : 'flex-col'}
        `}
      >
        {/* Sidebar */}
        {showSidebar && (
          <div className='w-80 shrink-0'>
            <div className='space-y-3'>
              <div
                className={`
                  h-10 rounded-lg bg-gray-200
                  dark:bg-gray-800
                `}
              />
              {sidebarKeys.map((key) => (
                <div
                  key={key}
                  className={`
                    h-16 rounded-lg bg-gray-200
                    dark:bg-gray-800
                  `}
                />
              ))}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className='flex-1'>
          <div className='space-y-4'>
            {contentKeys.map((key) => (
              <div key={key} className='space-y-2'>
                <div
                  className={`
                    h-6 w-1/4 rounded bg-gray-200
                    dark:bg-gray-800
                  `}
                />
                <div
                  className={`
                    h-20 rounded-lg bg-gray-200
                    dark:bg-gray-800
                  `}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PageSkeleton;
