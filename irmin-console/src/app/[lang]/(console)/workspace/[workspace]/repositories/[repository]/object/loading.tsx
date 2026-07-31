import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Repository object browser: 3-part — file tree sidebar + content area
 * + optional object details sidebar. Matches the real
 * `RepositoryObjectsSection` `lg:flex-row` layout.
 */
export default function RepositoryObjectLoading() {
  return (
    <div className='container mx-auto max-w-7xl p-4'>
      <div
        className={`
          flex flex-col gap-4
          lg:flex-row
        `}
      >
        <div
          className='
            w-full shrink-0
            lg:w-72
          '
        >
          <LoadingSkeleton className='h-96 w-full rounded-md' />
        </div>
        <div className='min-w-0 flex-1'>
          <LoadingSkeleton className='mb-3 h-10 w-full rounded-md' />
          <LoadingSkeleton className='h-112 w-full rounded-lg' />
        </div>
      </div>
    </div>
  );
}
