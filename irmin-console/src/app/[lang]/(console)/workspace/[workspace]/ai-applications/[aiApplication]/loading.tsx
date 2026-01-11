import PageSkeleton from '@/components/ui/loading/PageSkeleton';

export default function AIApplicationLoading() {
  return (
    <div
      className={`
        relative container mx-auto max-w-7xl px-2
        md:px-4
      `}
    >
      <PageSkeleton showHeader={true} contentRows={3} className='py-4' />
    </div>
  );
}
