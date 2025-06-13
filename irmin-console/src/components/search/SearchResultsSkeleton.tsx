import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Skeleton loading component for search results
 * Displays multiple skeleton sections with items to simulate search results
 */
export default function SearchResultsSkeleton() {
  return (
    <div className='px-2 pt-2 lg:px-4 lg:pt-4'>
      {[...Array(3)].map((_, sectionIndex) => (
        <div key={`skeleton-section-${sectionIndex}`} className='mb-2 lg:mb-4'>
          {/* Section header skeleton */}
          <div className='mb-1 flex items-center pl-2 lg:mb-2'>
            <div className='h-5 w-5 animate-pulse rounded bg-gray-200 dark:bg-gray-800' />
            <LoadingSkeleton className='ml-2 h-4 w-24' />
          </div>

          {/* Section items skeleton */}
          <ul className='space-y-1'>
            {[...Array(2 + sectionIndex)].map((_, itemIndex) => (
              <li
                key={`skeleton-item-${sectionIndex}-${itemIndex}`}
                className='rounded-lg px-2 py-2'
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
