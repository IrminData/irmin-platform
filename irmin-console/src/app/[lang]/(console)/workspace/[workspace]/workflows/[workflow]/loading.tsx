import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Workflow loading UI
 */
export default function WorkflowLoading() {
  return (
    <div
      id='workflow-loading'
      className='relative container mx-auto max-w-7xl py-12'
    >
      <LoadingSkeleton className='h-96' />
    </div>
  );
}
