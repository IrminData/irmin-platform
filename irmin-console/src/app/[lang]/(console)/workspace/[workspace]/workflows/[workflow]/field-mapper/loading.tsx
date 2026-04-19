import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

export default function WorkflowFieldMapperLoading() {
  return (
    <div className='container mx-auto max-w-5xl px-4 py-6'>
      <div className='mb-6 flex items-center justify-between'>
        <LoadingSkeleton className='h-6 w-48' />
        <LoadingSkeleton className='h-10 w-28 rounded-md' />
      </div>
      <div
        className='
          grid grid-cols-1 gap-4
          md:grid-cols-2
        '
      >
        <div className='flex flex-col gap-2'>
          <LoadingSkeleton className='mb-1 h-4 w-24' />
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingSkeleton
              key={`src-${i}`}
              className='h-10 w-full rounded-md'
            />
          ))}
        </div>
        <div className='flex flex-col gap-2'>
          <LoadingSkeleton className='mb-1 h-4 w-24' />
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingSkeleton
              key={`tgt-${i}`}
              className='h-10 w-full rounded-md'
            />
          ))}
        </div>
      </div>
    </div>
  );
}
