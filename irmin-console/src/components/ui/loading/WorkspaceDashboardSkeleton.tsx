import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Mirror skeleton for `DashboardSection`:
 *
 * - Navigation button row (9 buttons)
 * - AI Assistant + Workflow Runs stacked, `lg:flex-row lg:max-h-[550px]`
 * - 4-col list-card grid `grid-cols-1 md:grid-cols-2 xl:grid-cols-4`
 */

const NavigationButtonsSkeleton = () => (
  <div className='flex flex-row flex-wrap gap-2'>
    {Array.from({ length: 9 }).map((_, i) => (
      <LoadingSkeleton key={`nav-${i}`} className='h-8 w-24' />
    ))}
  </div>
);

const AssistantPanelSkeleton = () => (
  <div
    className={`
      w-full overflow-hidden rounded-xl border border-border bg-card p-4
    `}
  >
    <div className='mb-4 flex items-center justify-between'>
      <LoadingSkeleton className='h-5 w-32' />
      <LoadingSkeleton className='size-8' />
    </div>
    <div className='space-y-3'>
      <LoadingSkeleton className='h-4 w-full' />
      <LoadingSkeleton className='h-4 w-3/4' />
      <LoadingSkeleton className='h-4 w-1/2' />
    </div>
    <LoadingSkeleton className='mt-4 h-10 w-full rounded-md' />
  </div>
);

/**
 * Mirrors `DashboardWorkflowRunsFeed`'s own inline `isLoading` state:
 * wrapped in `<Card>` (rounded-lg + border), CardHeader with icon
 * + "Recent runs" title + "View all" button on the right, CardContent
 * with 8 bordered row stubs each carrying a tiny title line + badge
 * and a bottom row of two short metadata pills.
 */
const WorkflowRunsFeedSkeleton = () => (
  <div className='flex w-full max-w-md flex-col overflow-hidden'>
    <div
      className={`
        flex h-full flex-col rounded-lg border border-border bg-card shadow-sm
      `}
    >
      {/* CardHeader: icon + title + View all */}
      <div className='flex items-center justify-between p-4'>
        <div className='flex items-center gap-2'>
          <LoadingSkeleton className='size-4' />
          <LoadingSkeleton className='h-4 w-28' />
        </div>
        <LoadingSkeleton className='h-7 w-16 rounded-md' />
      </div>
      {/* CardContent: list of bordered run stubs — same shape the real
          component renders during its `workflowRunsQuery.isLoading` branch. */}
      <div
        className={`
          flex flex-1 flex-col space-y-1 overflow-y-auto px-2 pt-0 pb-2
          lg:px-4
        `}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`run-${i}`}
            className='rounded-lg border border-border p-1.5'
          >
            <div className='mb-0.5 flex items-center gap-1.5'>
              <LoadingSkeleton className='h-3 w-1/3' />
              <LoadingSkeleton className='h-4 w-16' />
            </div>
            <div className='flex items-center gap-2'>
              <LoadingSkeleton className='h-3 w-20' />
              <LoadingSkeleton className='h-3 w-16' />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ListCardSkeleton = () => (
  <div className='rounded-xl bg-card p-4'>
    <div className='mb-4 flex items-center justify-between'>
      <LoadingSkeleton className='h-5 w-24' />
      <LoadingSkeleton className='h-6 w-16 rounded-md' />
    </div>
    <div className='flex flex-col gap-2'>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={`item-${i}`}
          className='flex items-center justify-between rounded-sm p-2'
        >
          <div className='flex items-center gap-2'>
            <LoadingSkeleton className='size-4' />
            <LoadingSkeleton className='h-4 w-28' />
          </div>
          <LoadingSkeleton className='h-4 w-12' />
        </div>
      ))}
    </div>
  </div>
);

const WorkspaceDashboardSkeleton = () => {
  return (
    <div className='pattern-bg min-h-full py-4'>
      <div
        className={`
          relative container mx-auto max-w-6xl
          lg:px-4
        `}
      >
        <div className='flex flex-col gap-4 px-4 pb-12'>
          <NavigationButtonsSkeleton />

          <div
            className={`
              flex flex-col gap-4
              lg:max-h-[550px] lg:flex-row
            `}
          >
            <AssistantPanelSkeleton />
            <WorkflowRunsFeedSkeleton />
          </div>

          <div
            className={`
              grid grid-cols-1 gap-4
              md:grid-cols-2
              xl:grid-cols-4
            `}
          >
            <ListCardSkeleton />
            <ListCardSkeleton />
            <ListCardSkeleton />
            <ListCardSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceDashboardSkeleton;
