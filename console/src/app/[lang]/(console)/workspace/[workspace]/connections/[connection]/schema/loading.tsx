import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Connection schema tab body — tab headers (view / validate) on top,
 * large code-block area below.
 */
export default function ConnectionSchemaLoading() {
  return (
    <div className='container mx-auto max-w-7xl px-4 py-6'>
      <div className='mb-4 flex items-center gap-2'>
        <LoadingSkeleton className='h-9 w-24 rounded-md' />
        <LoadingSkeleton className='h-9 w-24 rounded-md' />
      </div>
      <LoadingSkeleton className='h-96 w-full rounded-lg' />
    </div>
  );
}
