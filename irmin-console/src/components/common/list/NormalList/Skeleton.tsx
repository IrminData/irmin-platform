import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

/**
 * Skeleton UI for lists
 */
const NormalListSkeleton = () => {
  return (
    <div className='px-4 pb-28' id='table-loading-skeleton'>
      <LoadingSkeleton className='mb-2 h-10 w-full' />
      <LoadingSkeleton className='mb-2 h-10 w-full' />
      <LoadingSkeleton className='mb-2 h-10 w-full' />
      <LoadingSkeleton className='mb-2 h-10 w-full' />
      <LoadingSkeleton className='mb-2 h-10 w-full' />
      <LoadingSkeleton className='mb-2 h-10 w-full' />
      <LoadingSkeleton className='mb-2 h-10 w-full' />
      <LoadingSkeleton className='mb-2 h-10 w-full' />
    </div>
  );
};

export default NormalListSkeleton;
