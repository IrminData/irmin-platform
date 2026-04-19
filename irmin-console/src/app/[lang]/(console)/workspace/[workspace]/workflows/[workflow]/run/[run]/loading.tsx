import LogsFeedSkeleton from '@/components/ui/loading/LogsFeedSkeleton';

export default function WorkflowRunLoading() {
  return <LogsFeedSkeleton showFilters={false} rowCount={15} />;
}
