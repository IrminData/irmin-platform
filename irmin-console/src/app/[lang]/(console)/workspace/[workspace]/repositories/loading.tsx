import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

export default function RepositoriesLoading() {
  return (
    <div
      id='repositories-loading'
      className='relative container mx-auto max-w-6xl py-12'
    >
      <LoadingSkeleton className='h-96' />
    </div>
  );
}
