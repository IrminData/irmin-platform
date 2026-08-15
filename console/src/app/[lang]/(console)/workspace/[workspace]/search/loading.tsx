import SearchResultsSkeleton from '@/components/search/SearchResultsSkeleton';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

export default function SearchLoading() {
  return (
    <div
      className='
        mx-auto max-w-6xl space-y-6 p-4
        md:p-6
      '
    >
      <div className='space-y-2'>
        <LoadingSkeleton className='h-10 w-40' />
        <LoadingSkeleton className='h-4 w-full max-w-md' />
      </div>
      <LoadingSkeleton className='h-11 w-full' />
      <div className='flex items-center justify-between'>
        <LoadingSkeleton className='h-11 w-28' />
      </div>
      <SearchResultsSkeleton />
    </div>
  );
}
