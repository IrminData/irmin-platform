import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Skeleton loading component for search results
 * Displays multiple skeleton sections with items to simulate search results
 */
export default function SearchResultsSkeleton() {
  // Unique keys for each repetitive element
  const sectionKeys = [...Array(3)].map(
    (_, index) => `skeleton-section-${index}`
  );
  const itemKeys = [...Array(3)].map((_, sectionIndex) =>
    [...Array(2 + sectionIndex)].map(
      (_, itemIndex) => `skeleton-item-${sectionIndex}-${itemIndex}`
    )
  );

  return (
    <div
      className={`
        px-2 pt-2
        lg:px-4 lg:pt-4
      `}
    >
      {[...Array(3)].map((_, sectionIndex) => (
        <div
          key={sectionKeys[sectionIndex]}
          className={`
            mb-2
            lg:mb-4
          `}
        >
          {/* Section header skeleton */}
          <div
            className={`
              mb-1 flex items-center pl-2
              lg:mb-2
            `}
          >
            <div className='size-5 animate-pulse rounded-sm bg-muted' />
            <LoadingSkeleton className='ml-2 h-4 w-24' />
          </div>

          {/* Section items skeleton */}
          <ul className='space-y-1'>
            {[...Array(2 + sectionIndex)].map((_, itemIndex) => (
              <li
                key={itemKeys[sectionIndex][itemIndex]}
                className='rounded-lg p-2'
              >
                <div className='space-y-2'>
                  <LoadingSkeleton className='h-4 w-full max-w-xs' />
                  <LoadingSkeleton className='h-3 w-full max-w-md opacity-60' />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
