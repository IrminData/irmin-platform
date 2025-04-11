import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Workspace loading UI
 */
export default function WorkspaceLoading() {
  return (
    <div
      id='workspace-loading'
      className='relative container mx-auto max-w-6xl py-12'
    >
      <LoadingSkeleton className='h-96' />
    </div>
  );
}
