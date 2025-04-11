import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

export default function TokensLoading() {
  return (
    <div
      id='tokens-loading'
      className='relative container mx-auto max-w-6xl py-12'
    >
      <LoadingSkeleton className='h-96' />
    </div>
  );
}
