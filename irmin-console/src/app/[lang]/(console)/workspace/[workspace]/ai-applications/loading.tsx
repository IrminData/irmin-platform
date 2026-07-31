import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * AI Applications list loading UI — mirrors `AIApplicationList`'s
 * internal loading state: 6 cards in a
 * `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` grid, each `h-40`.
 * Keeping shape + count identical means the route skeleton and the
 * client-side list skeleton produce the same DOM, so there's no
 * visible second pulse on mount.
 */
export default function AIApplicationsLoading() {
  return (
    <div className='relative container mx-auto max-w-7xl px-4 py-8'>
      <div className='my-4 flex flex-row items-center justify-between gap-4'>
        <LoadingSkeleton className='h-9 w-64 max-w-full' />
        <LoadingSkeleton className='h-11 w-44 shrink-0 rounded-md' />
      </div>
      <div className='py-4'>
        <LoadingSkeleton className='mb-4 h-11 w-full rounded-md' />
        <div
          className={`
            grid grid-cols-1 gap-4
            md:grid-cols-2
            lg:grid-cols-3
          `}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingSkeleton key={`card-${i}`} className='h-40 w-full' />
          ))}
        </div>
      </div>
    </div>
  );
}
