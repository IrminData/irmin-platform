const SkeletonConnectorInfo = () => (
  <div
    className={`
      flex flex-col justify-center border-b pb-4
      dark:border-gray-800
    `}
  >
    <div
      className={`
        mb-2 h-4 w-32 animate-pulse rounded bg-gray-200
        dark:bg-gray-800
      `}
    />
    <div className='flex items-center space-x-4'>
      <div
        className={`
          size-16 animate-pulse rounded bg-gray-200
          dark:bg-gray-800
        `}
      />
      <div className='flex flex-col gap-1'>
        <div
          className={`
            h-6 w-24 animate-pulse rounded bg-gray-200
            dark:bg-gray-800
          `}
        />
        <div
          className={`
            h-5 w-32 animate-pulse rounded bg-gray-200
            dark:bg-gray-800
          `}
        />
        <div
          className={`
            h-4 w-48 animate-pulse rounded bg-gray-200
            dark:bg-gray-800
          `}
        />
      </div>
    </div>
  </div>
);

const SkeletonFormField = ({
  withHelpText = false,
}: {
  withHelpText?: boolean;
}) => (
  <div className='space-y-2'>
    <div
      className={`
        h-4 w-24 animate-pulse rounded bg-gray-200
        dark:bg-gray-800
      `}
    />
    <div
      className={`
        h-10 w-full animate-pulse rounded bg-gray-200
        dark:bg-gray-800
      `}
    />
    {withHelpText && (
      <div
        className={`
          h-3 w-40 animate-pulse rounded bg-gray-200
          dark:bg-gray-800
        `}
      />
    )}
  </div>
);

const SkeletonButton = ({ fullWidth = true }: { fullWidth?: boolean }) => (
  <div
    className={`
      h-12 animate-pulse rounded bg-gray-200
      dark:bg-gray-800
      ${fullWidth ? `w-full` : `w-32`}
    `}
  />
);

const SkeletonConnectorCard = () => (
  <div
    className={`
      flex w-max max-w-[50%] flex-row items-center justify-start gap-4
      rounded-lg bg-gray-100 px-4 py-2
      dark:bg-gray-800
    `}
  >
    <div
      className={`
        size-12 animate-pulse rounded bg-gray-200
        dark:bg-gray-800
      `}
    />
    <div className='flex flex-col justify-start gap-1'>
      <div
        className={`
          h-5 w-16 animate-pulse rounded bg-gray-200
          dark:bg-gray-800
        `}
      />
      <div
        className={`
          h-4 w-24 animate-pulse rounded bg-gray-200
          dark:bg-gray-800
        `}
      />
    </div>
  </div>
);

/**
 * Skeleton component for connection creation loading states
 */
export const ConnectionCreationSkeleton = ({
  variant = 'form',
}: {
  variant?: 'form' | 'connectors' | 'category-filter';
}) => {
  if (variant === 'connectors') {
    return (
      <div className='flex w-full flex-col space-y-6'>
        {/* Category Filter Skeleton */}
        <div
          className={`
            flex w-full flex-wrap gap-2 border-b pb-4
            dark:border-gray-800
          `}
        >
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={`category-filter-${i}`}
              className={`
                h-8 w-20 animate-pulse rounded bg-gray-200
                dark:bg-gray-800
              `}
            />
          ))}
        </div>

        {/* Connectors Grid Skeleton */}
        <div className='flex flex-wrap gap-2'>
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonConnectorCard key={`connector-card-${i}`} />
          ))}
        </div>

        {/* Action Button Skeleton */}
        <div
          className={`
            border-t pt-4
            dark:border-gray-800
          `}
        >
          <SkeletonButton />
        </div>

        {/* Secondary Actions */}
        <div className='flex items-center justify-between'>
          <SkeletonButton fullWidth={false} />
          <SkeletonButton fullWidth={false} />
        </div>
      </div>
    );
  }

  if (variant === 'category-filter') {
    return (
      <div
        className={`
          flex w-full flex-wrap gap-2 border-b pb-4
          dark:border-gray-800
        `}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={`category-filter-alt-${i}`}
            className={`
              h-8 w-16 animate-pulse rounded bg-gray-200
              dark:bg-gray-800
            `}
          />
        ))}
      </div>
    );
  }

  // Default form variant
  return (
    <div className='space-y-6'>
      {/* Connector Info Skeleton */}
      <SkeletonConnectorInfo />

      {/* Form Fields Skeleton */}
      <div className='flex flex-col gap-4'>
        <SkeletonFormField />
        <SkeletonFormField withHelpText />
        <SkeletonFormField />
        <SkeletonFormField withHelpText />
      </div>

      {/* Submit Button Skeleton */}
      <SkeletonButton />

      {/* Go Back Button Skeleton */}
      <SkeletonButton />
    </div>
  );
};
