import ListPageSkeleton from '@/components/ui/loading/ListPageSkeleton';

/**
 * Workflow runs feed — status badge + timestamp + duration + actions
 * (4 columns).
 */
export default function WorkflowRunsLoading() {
  return <ListPageSkeleton columnCount={4} showCreateButton={false} />;
}
