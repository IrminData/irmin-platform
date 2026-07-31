import ListShellSkeleton from '@/components/ui/loading/ListShellSkeleton';

export default function RepositoryUncommittedChangesLoading() {
  return (
    <div className='container mx-auto max-w-7xl p-4'>
      <ListShellSkeleton columnCount={3} />
    </div>
  );
}
