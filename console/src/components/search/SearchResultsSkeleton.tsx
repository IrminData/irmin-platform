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
    <div className='space-y-8'>
      {[...Array(3)].map((_, sectionIndex) => (
        <div key={sectionKeys[sectionIndex]} className='space-y-4'>
          {/* Section header skeleton */}
          <div className='flex items-center gap-2'>
            <div className='size-5 animate-pulse rounded-[2px] bg-muted' />
            <LoadingSkeleton className='h-5 w-28' />
          </div>

          {/* Section items skeleton */}
          <ul className='grid gap-4'>
            {[...Array(2 + sectionIndex)].map((_, itemIndex) => (
              <li
                key={itemKeys[sectionIndex][itemIndex]}
                className='rounded-[2px] border border-border bg-card p-4'
              >
                <div className='flex items-start gap-3'>
                  <LoadingSkeleton className='size-4 shrink-0' />
                  <div className='w-full space-y-2'>
                    <LoadingSkeleton className='h-6 w-full max-w-xs' />
                    <LoadingSkeleton className='h-4 w-full max-w-md opacity-60' />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
