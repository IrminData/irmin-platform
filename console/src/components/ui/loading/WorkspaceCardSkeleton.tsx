import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Workspace row skeleton.
 */
export const WorkspaceCardSkeleton = ({
  className = '',
}: {
  className?: string;
}) => {
  return (
    <div
      className={`
        flex items-center gap-4 rounded-xl bg-card px-4 py-3
        ${className}
      `}
    >
      <LoadingSkeleton className='size-9 shrink-0 rounded-lg' />

      <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
        <LoadingSkeleton className='h-4 w-1/3' />
        <LoadingSkeleton className='h-3 w-1/2' />
      </div>

      <div
        className={`
          hidden shrink-0 items-center gap-4
          md:flex
        `}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`stat-${i}`} className='flex items-center gap-1'>
            <LoadingSkeleton className='size-3.5' />
            <LoadingSkeleton className='h-3 w-4' />
          </div>
        ))}
      </div>

      <LoadingSkeleton className='size-4 shrink-0' />
    </div>
  );
};
