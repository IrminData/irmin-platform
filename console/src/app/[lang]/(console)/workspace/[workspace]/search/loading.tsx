import SearchResultsSkeleton from '@/components/search/SearchResultsSkeleton';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

export default function SearchLoading() {
  return (
    <div className='container mx-auto max-w-6xl px-4 py-8'>
      <div className='mb-4 flex items-center gap-3'>
        <LoadingSkeleton className='size-10 rounded-full' />
        <LoadingSkeleton className='h-11 w-full rounded-md' />
      </div>
      <div className='mb-4 flex flex-wrap gap-2'>
        <LoadingSkeleton className='h-8 w-20 rounded-full' />
        <LoadingSkeleton className='h-8 w-24 rounded-full' />
        <LoadingSkeleton className='h-8 w-16 rounded-full' />
      </div>
      <SearchResultsSkeleton />
    </div>
  );
}
