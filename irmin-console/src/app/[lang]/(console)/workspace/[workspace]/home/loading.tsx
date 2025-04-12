import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

export default function WorkspaceHomeLoading() {
  return (
    <div
      id='workspace-home-loading'
      className='relative container mx-auto max-w-7xl py-12'
    >
      <LoadingSkeleton className='h-96' />
    </div>
  );
}
