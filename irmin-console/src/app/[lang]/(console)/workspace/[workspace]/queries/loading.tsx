import PageSkeleton from '@/components/ui/loading/PageSkeleton';

export default function QueriesLoading() {
  return (
    <div
      id='queries-loading'
      className='relative container mx-auto max-w-7xl py-12'
    >
      <PageSkeleton showSidebar={true} contentRows={3} />
    </div>
  );
}
