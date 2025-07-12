import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

export default function LogEventsLoading() {
  return (
    <div
      id='log-events-loading'
      className='relative container mx-auto max-w-7xl py-28'
    >
      <LoadingSkeleton className='h-96 w-full' />
    </div>
  );
}
