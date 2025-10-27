/**
 * Skeleton component for file navigator items during loading
 *
 * @remarks
 *
 * This component is used to display a loading skeleton for the file navigator items.
 *
 * It is used to indicate that the file navigator is loading.
 */
const FileNavigatorLoadingSkeleton = ({ items = 6 }: { items?: number }) => {
  const widths = [45, 60, 35, 55, 40, 50];
  const itemKeys = Array.from(
    { length: items },
    (_, i) => `file-skeleton-item-${i}`
  );

  return (
    <div className='animate-pulse space-y-1'>
      {itemKeys.map((key, i) => (
        <div
          key={key}
          className='flex items-center justify-normal rounded-md p-1'
        >
          {/* Chevron skeleton */}
          <div
            className={`
              size-4 rounded bg-gray-200
              dark:bg-gray-700
            `}
          />

          {/* Icon skeleton */}
          <div
            className={`
              ml-2 size-4 rounded bg-gray-200
              dark:bg-gray-700
            `}
          />

          {/* Name skeleton */}
          <div
            className={`
              ml-2 h-4 flex-1 rounded bg-gray-200
              dark:bg-gray-700
            `}
            style={{ width: `${widths[i % widths.length]}%` }}
          />

          {/* Menu button skeleton */}
          <div
            className={`
              ml-auto size-4 rounded bg-gray-200
              dark:bg-gray-700
            `}
          />
        </div>
      ))}
    </div>
  );
};

export default FileNavigatorLoadingSkeleton;
