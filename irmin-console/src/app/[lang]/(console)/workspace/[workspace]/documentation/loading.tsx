import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

export default function DocumentationLoading() {
  return (
    <div
      id='documentation-loading'
      className='relative container mx-auto max-w-7xl py-12'
    >
      <LoadingSkeleton className='h-96' />
    </div>
  );
}
