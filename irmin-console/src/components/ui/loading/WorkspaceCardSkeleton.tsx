import React from 'react';

/**
 * Workspace card skeleton component for loading states
 */
export function WorkspaceCardSkeleton({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className='bg-card text-card-foreground border-border/30 flex h-full min-h-[140px] flex-col rounded-xl border p-4'>
        {/* Header with label and icon */}
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            {/* Workspace label skeleton */}
            <div className='h-3 w-16 rounded bg-gray-200 dark:bg-gray-800'></div>

            {/* Workspace name skeleton */}
            <div className='mt-1 h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-800'></div>
          </div>

          {/* Icon skeleton */}
          <div className='ml-2 h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-800'></div>
        </div>

        {/* Description skeleton */}
        <div className='mt-2 mb-4 space-y-2'>
          <div className='h-3 w-4/5 rounded bg-gray-200 dark:bg-gray-800'></div>
          <div className='h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-800'></div>
        </div>

        {/* Grow spacer */}
        <div className='grow'></div>

        {/* Users section skeleton */}
        <div className='mt-auto flex items-center gap-2'>
          <div className='flex -space-x-2'>
            {/* User avatars skeleton */}
            <div className='h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-800'></div>
            <div className='h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-800'></div>
            <div className='h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-800'></div>
          </div>

          {/* Member count skeleton */}
          <div className='h-3 w-16 rounded bg-gray-200 dark:bg-gray-800'></div>
        </div>
      </div>
    </div>
  );
}

export default WorkspaceCardSkeleton;
