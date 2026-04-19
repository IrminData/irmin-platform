import type { ReactNode } from 'react';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Mirror skeleton for the detail-page header row shared by
 * `RepositoryHeader`, `ConnectionLayoutWrapper`, `WorkflowLayoutWrapper`
 * and `AIApplicationHeader`.
 *
 * Renders ONLY the inner flex row (metadata + title + description +
 * tags on the left, caller-supplied `rightSlot` on the right). The
 * surrounding `container mx-auto max-w-7xl` wrapper is owned by the
 * layout skeleton so that it can hold BOTH the header row and the
 * following `<TabsWithBackButtonSkeleton>` in the same container —
 * matching every real layout, where the tabs sit inside the same
 * max-w-7xl box as the header (if the tabs render outside, they
 * visually drift wider than the header on large viewports).
 *
 * Right-column shape varies by layout:
 * - Repository / Workflow: `flex min-w-60 flex-col gap-2` — vertically
 *   stacked buttons. Inner wrapper uses `lg:items-center` WITHOUT
 *   `lg:justify-between`; left has `flex-1` to claim remaining width.
 * - Connection: inline row. Uses `lg:justify-between` and left column
 *   drops `flex-1`, letting the two columns push apart.
 * - AI App: inline row, but left keeps `flex-1`, no `lg:justify-between`.
 */
const DetailHeaderSkeleton = ({
  rightSlot,
  justifyBetween = false,
  leftFill = true,
  showTags = true,
  metadataItems = 2,
}: {
  /** Right-column contents. When omitted, no right column is rendered. */
  rightSlot?: ReactNode;
  /**
   * Add `lg:justify-between` on the inner flex wrapper. Use for layouts
   * where left column does NOT have `flex-1` (Connection).
   */
  justifyBetween?: boolean;
  /**
   * Add `flex-1` to the left column so it claims remaining width on
   * desktop. True for Repository / Workflow / AI App; false for
   * Connection (which uses `justifyBetween` instead to push columns
   * apart).
   */
  leftFill?: boolean;
  showTags?: boolean;
  metadataItems?: number;
}) => {
  return (
    <div
      className={`
        mx-auto my-4 flex w-full flex-col px-2
        md:px-4
        lg:flex-row lg:items-center
        ${justifyBetween ? 'lg:justify-between' : ''}
      `}
    >
      <div
        className={`
          flex flex-col gap-2 py-4
          ${leftFill ? 'flex-1' : ''}
        `}
      >
        {/* Metadata row (owner • connector / status / etc.) */}
        <div className={`flex flex-row items-center divide-x divide-border`}>
          {Array.from({ length: metadataItems }).map((_, i) => (
            <div
              key={`meta-${i}`}
              className={`
                flex flex-row items-center gap-2
                ${i === 0 ? 'pr-2' : 'px-2'}
              `}
            >
              <LoadingSkeleton className='h-4 w-20' />
              {i === 0 && <LoadingSkeleton className='h-5 w-16' />}
            </div>
          ))}
        </div>

        {/* Title — matches DisplayTitle text-2xl md:text-3xl font-bold */}
        <LoadingSkeleton
          className='
            h-9 w-64
            md:w-96
          '
        />

        {/* Description */}
        <LoadingSkeleton className='h-4 w-2/3 max-w-xl' />

        {/* Tags */}
        {showTags && (
          <div className='flex gap-2'>
            <LoadingSkeleton className='h-5 w-12 rounded-full' />
            <LoadingSkeleton className='h-5 w-16 rounded-full' />
            <LoadingSkeleton className='h-5 w-20 rounded-full' />
          </div>
        )}
      </div>

      {rightSlot}
    </div>
  );
};

export default DetailHeaderSkeleton;
