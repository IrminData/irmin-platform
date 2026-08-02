import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import { WorkspaceCardSkeleton } from '@/components/ui/loading/WorkspaceCardSkeleton';

/**
 * Mirror skeleton for `ManageWorkspacesSection` (the workspace selector).
 *
 * Real structure (see `src/components/workspace/ManageWorkspacesSection.tsx`):
 * - Full-height wrapper (background grain handled globally).
 * - `container mx-auto max-w-4xl px-4 py-16`.
 * - Header row: `DisplayTitle` + description paragraph on the left,
 *   "Create new workspace" button on the right (gradient, size sm).
 * - Below: single-column `flex flex-col gap-2` list of `WorkspaceCard`
 *   rows.
 *
 * The previous loading.tsx rendered a two-column layout (a sidebar
 * "create workspace form" card + a multi-column workspace-card grid)
 * with raw `bg-gray-200 dark:bg-gray-800` skeletons — none of which
 * match the real page. Now aligned and using the `<LoadingSkeleton>`
 * primitive (semantic `bg-muted` token).
 */
export default function WorkspacesLoading() {
  return (
    <div className='h-full'>
      <div className='relative container mx-auto max-w-4xl px-4 py-16'>
        {/* Header: title + description + create button */}
        <div
          className={`
            mb-6 flex flex-col gap-4
            sm:flex-row sm:items-end sm:justify-between
          `}
        >
          <div className='min-w-0 space-y-2'>
            {/* DisplayTitle stub */}
            <LoadingSkeleton className='h-9 w-64 max-w-full' />
            {/* Description paragraph */}
            <LoadingSkeleton className='h-4 w-80 max-w-full' />
          </div>
          {/* Create new workspace button (size='sm' gradient) */}
          <LoadingSkeleton className='h-9 w-44 shrink-0 rounded-md' />
        </div>

        {/* Workspace list — single-column flex, matches real layout */}
        <div className='flex flex-col gap-2'>
          {Array.from({ length: 6 }).map((_, i) => (
            <WorkspaceCardSkeleton key={`workspace-${i}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
