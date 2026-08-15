import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

export default function RepositoryCompareLoading() {
  return (
    <div className='container mx-auto max-w-7xl p-4'>
      <div className='mb-4 flex flex-wrap items-center gap-2'>
        <LoadingSkeleton className='h-10 w-48 rounded-[2px]' />
        <LoadingSkeleton className='size-5' />
        <LoadingSkeleton className='h-10 w-48 rounded-[2px]' />
        <LoadingSkeleton className='h-10 w-28 rounded-[2px]' />
      </div>
      <LoadingSkeleton className='h-96 w-full rounded-[2px]' />
    </div>
  );
}
