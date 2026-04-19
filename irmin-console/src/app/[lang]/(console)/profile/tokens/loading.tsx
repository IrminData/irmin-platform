import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import { TableSkeleton } from '@/components/ui/loading/TableSkeleton';

/**
 * Mirror skeleton for `TokensSection`.
 *
 * Real structure (see `src/components/user/TokensSection.tsx`):
 * - `ContentWrapper wrapperClassName='max-w-7xl py-4'` — wide bordered
 *   card.
 * - Explainer banner with info icon + text paragraph + link
 *   (`bg-accent/10 border-accent/30 rounded-lg p-3`).
 * - Right-aligned "Create API token" button.
 * - Three-column table (name, expires-at, action).
 *
 * The previous `<ListPageSkeleton />` rendered title + search + list
 * cards, none of which exist on this page.
 */
export default function TokensLoading() {
  return (
    <div
      className={`
        relative container my-8 max-w-7xl px-2
        sm:mx-auto
      `}
    >
      <div
        className={`
          w-full max-w-7xl rounded-lg border border-border bg-popover/10 p-2
          py-4
        `}
      >
        {/* Explainer banner */}
        <div
          className={`
            mb-4 flex items-start gap-3 rounded-lg border border-accent/30
            bg-accent/10 p-3
          `}
        >
          <LoadingSkeleton className='mt-0.5 size-5 shrink-0 rounded-full' />
          <div className='flex-1 space-y-2'>
            <LoadingSkeleton className='h-4 w-full max-w-md' />
            <LoadingSkeleton className='h-3 w-32' />
          </div>
        </div>
        {/* Right-aligned create button */}
        <div className='mb-4 flex flex-row items-center justify-end px-2'>
          <LoadingSkeleton className='h-9 w-36 rounded-md' />
        </div>
        {/* Table */}
        <TableSkeleton rows={6} columns={3} />
      </div>
    </div>
  );
}
