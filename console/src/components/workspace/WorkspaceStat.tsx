'use client';

import type { IconType } from 'react-icons';

/**
 * Inline skeleton placeholder for a stat value while the summary loads.
 */
const StatSkeleton = () => (
  <div className='h-3 w-4 animate-pulse rounded-sm bg-muted' />
);

/**
 * Single stat cell used on WorkspaceCard (members, repositories, workflows,
 * connections). Icon is decorative; the label (from the dict) is surfaced to
 * screen readers and hover tooltips. The number column uses tabular-nums so
 * values align across rows.
 */
export default function WorkspaceStat({
  Icon,
  count,
  label,
}: {
  Icon: IconType;
  count: number | undefined;
  label: string;
}) {
  const hasCount = count !== undefined;
  return (
    <div
      className='
        flex items-center gap-1 text-xs text-muted-foreground tabular-nums
      '
      title={hasCount ? `${count} ${label}` : undefined}
      aria-label={hasCount ? `${count} ${label}` : label}
    >
      <Icon className='size-3.5' aria-hidden='true' />
      {hasCount ? <span>{count}</span> : <StatSkeleton />}
    </div>
  );
}
