import LoadingSkeleton from '@/components/misc/LoadingSkeleton';

/**
 * Skeleton UI for the list tables
 */
const TableSkeleton = () => {
  return (
    <div className='px-4 pb-28'>
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

export default TableSkeleton;
