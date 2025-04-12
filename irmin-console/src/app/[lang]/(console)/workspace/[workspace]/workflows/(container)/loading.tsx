import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Workflows loading UI
 */
export default function WorkflowsLoading() {
  return (
    <div
      id='workflows-loading'
      className='relative container mx-auto max-w-7xl py-12'
    >
      <LoadingSkeleton className='h-96' />
    </div>
  );
}
