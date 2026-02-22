/**
 * Workspace row skeleton component for loading states
 */
export const WorkspaceCardSkeleton = ({
  className = '',
}: {
  className?: string;
}) => {
  return (
    <div
      className={`
        flex animate-pulse items-center gap-4 rounded-xl bg-card px-4 py-3
        ${className}
      `}
    >
      {/* Icon placeholder */}
      <div
        className={`
          size-9 shrink-0 rounded-lg bg-gray-200
          dark:bg-gray-800
        `}
      />

      {/* Name + Description */}
      <div className='min-w-0 flex-1 space-y-1.5'>
        <div
          className={`
            h-4 w-1/3 rounded-sm bg-gray-200
            dark:bg-gray-800
          `}
        />
        <div
          className={`
            h-3 w-1/2 rounded-sm bg-gray-200
            dark:bg-gray-800
          `}
        />
      </div>

      {/* Stats placeholders */}
      <div
        className={`
          hidden shrink-0 items-center gap-4
          md:flex
        `}
      >
        {Array.from({ length: 4 }, (_, idx) => (
          <div key={`stat-skeleton-${idx}`} className='flex items-center gap-1'>
            <div
              className={`
                size-3.5 rounded-sm bg-gray-200
                dark:bg-gray-800
              `}
            />
            <div
              className={`
                h-3 w-4 rounded-sm bg-gray-200
                dark:bg-gray-800
              `}
            />
          </div>
        ))}
      </div>

      {/* Chevron placeholder */}
      <div
        className={`
          size-4 shrink-0 rounded-sm bg-gray-200
          dark:bg-gray-800
        `}
      />
    </div>
  );
};
