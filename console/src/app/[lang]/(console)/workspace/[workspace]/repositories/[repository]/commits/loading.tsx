import ListShellSkeleton from '@/components/ui/loading/ListShellSkeleton';

export default function RepositoryCommitsLoading() {
  return (
    <div className='container mx-auto max-w-7xl p-4'>
      <ListShellSkeleton columnCount={4} />
    </div>
  );
}
