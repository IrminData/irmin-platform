import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Repository schema browser: schema tree sidebar + preview panel,
 * mirrors the real `RepositorySchemaSection` `lg:flex-row` layout.
 */
export default function RepositorySchemaLoading() {
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
            lg:w-80
          '
        >
          <LoadingSkeleton className='h-96 w-full rounded-md' />
        </div>
        <div className='min-w-0 flex-1'>
          <LoadingSkeleton className='h-112 w-full rounded-lg' />
        </div>
      </div>
    </div>
  );
}
