/**
 * Workspace card skeleton component for loading states
 */
export const WorkspaceCardSkeleton = ({
  className = '',
}: {
  className?: string;
}) => {
  return (
    <div
      className={`
        animate-pulse
        ${className}
      `}
    >
      <div
        className={`
          flex h-full min-h-[140px] flex-col rounded-xl bg-card p-4
          text-card-foreground
        `}
      >
        {/* Header with label and icon */}
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            {/* Workspace label skeleton */}
            <div
              className={`
                h-3 w-16 rounded bg-gray-200
                dark:bg-gray-800
              `}
            />

            {/* Workspace name skeleton */}
            <div
              className={`
                mt-1 h-5 w-3/4 rounded bg-gray-200
                dark:bg-gray-800
              `}
            />
          </div>

          {/* Icon skeleton */}
          <div
            className={`
              ml-2 size-8 rounded-full bg-gray-200
              dark:bg-gray-800
            `}
          />
        </div>

        {/* Description skeleton */}
        <div className='mt-2 mb-4 space-y-2'>
          <div
            className={`
              h-3 w-4/5 rounded bg-gray-200
              dark:bg-gray-800
            `}
          />
          <div
            className={`
              h-3 w-1/2 rounded bg-gray-200
              dark:bg-gray-800
            `}
          />
        </div>

        {/* Grow spacer */}
        <div className='grow' />

        {/* Users section skeleton */}
        <div className='mt-auto flex items-center gap-2'>
          <div className='flex -space-x-2'>
            {/* User avatars skeleton */}
            <div
              className={`
                size-7 rounded-full bg-gray-200
                dark:bg-gray-800
              `}
            />
            <div
              className={`
                size-7 rounded-full bg-gray-200
                dark:bg-gray-800
              `}
            />
            <div
              className={`
                size-7 rounded-full bg-gray-200
                dark:bg-gray-800
              `}
            />
          </div>

          {/* Member count skeleton */}
          <div
            className={`
              h-3 w-16 rounded bg-gray-200
              dark:bg-gray-800
            `}
          />
        </div>
      </div>
    </div>
  );
};
