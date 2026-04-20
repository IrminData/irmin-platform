import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

const SkeletonConnectorInfo = () => (
  <div className='flex flex-col justify-center border-b border-border pb-4'>
    <LoadingSkeleton className='mb-2 h-4 w-32' />
    <div className='flex items-center gap-4'>
      <LoadingSkeleton className='size-16 rounded-full' />
      <div className='flex flex-col gap-1'>
        <LoadingSkeleton className='h-6 w-24' />
        <LoadingSkeleton className='h-5 w-32' />
        <LoadingSkeleton className='h-4 w-48' />
      </div>
    </div>
  </div>
);

const SkeletonFormField = ({
  withHelpText = false,
}: {
  withHelpText?: boolean;
}) => (
  <div className='flex flex-col gap-2'>
    <LoadingSkeleton className='h-4 w-24' />
    <LoadingSkeleton className='h-10 w-full rounded-md' />
    {withHelpText && <LoadingSkeleton className='h-3 w-40' />}
  </div>
);

const SkeletonButton = ({ fullWidth = true }: { fullWidth?: boolean }) => (
  <LoadingSkeleton
    className={`
      h-12 rounded-md
      ${fullWidth ? 'w-full' : 'w-32'}
    `}
  />
);

const SkeletonConnectorCard = () => (
  <div
    className={`
      flex w-max max-w-[50%] flex-row items-center justify-start gap-4
      rounded-lg bg-muted/40 px-4 py-2
    `}
  >
    <LoadingSkeleton className='size-12 rounded-full' />
    <div className='flex flex-col gap-1'>
      <LoadingSkeleton className='h-5 w-16' />
      <LoadingSkeleton className='h-4 w-24' />
    </div>
  </div>
);

/**
 * Skeleton component for connection creation loading states.
 */
export const ConnectionCreationSkeleton = ({
  variant = 'form',
}: {
  variant?: 'form' | 'connectors' | 'category-filter';
}) => {
  if (variant === 'connectors') {
    return (
      <div className='flex w-full flex-col gap-6'>
        <div className='flex w-full flex-wrap gap-2 border-b border-border pb-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={`cat-${i}`} className='h-8 w-20 rounded-md' />
          ))}
        </div>

        <div className='flex flex-wrap gap-2'>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonConnectorCard key={`card-${i}`} />
          ))}
        </div>

        <div className='border-t border-border pt-4'>
          <SkeletonButton />
        </div>

        <div className='flex items-center justify-between'>
          <SkeletonButton fullWidth={false} />
          <SkeletonButton fullWidth={false} />
        </div>
      </div>
    );
  }

  if (variant === 'category-filter') {
    return (
      <div className='flex w-full flex-wrap gap-2 border-b border-border pb-4'>
        {Array.from({ length: 5 }).map((_, i) => (
          <LoadingSkeleton
            key={`cat-alt-${i}`}
            className='h-8 w-16 rounded-md'
          />
        ))}
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6'>
      <SkeletonConnectorInfo />
      <div className='flex flex-col gap-4'>
        <SkeletonFormField />
        <SkeletonFormField withHelpText />
        <SkeletonFormField />
        <SkeletonFormField withHelpText />
      </div>
      <SkeletonButton />
      <SkeletonButton />
    </div>
  );
};
