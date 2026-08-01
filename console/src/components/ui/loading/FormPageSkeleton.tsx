import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Skeleton for centered auth-style form pages (sign-in, sign-up,
 * invite acceptance).
 */
const FormPageSkeleton = () => {
  return (
    <div className='relative container mx-auto max-w-lg px-4 py-24'>
      <div className='rounded-lg border border-border bg-card p-4 shadow-xs'>
        <div className='mb-8 flex flex-col items-center gap-4 text-center'>
          <LoadingSkeleton className='h-8 w-48' />
          <LoadingSkeleton className='h-4 w-64 max-w-full' />
        </div>

        <div className='flex flex-col gap-6'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`field-${i}`} className='flex flex-col gap-2'>
              <LoadingSkeleton className='h-4 w-20' />
              <LoadingSkeleton className='h-10 w-full rounded-md' />
            </div>
          ))}

          <div className='flex items-center gap-3'>
            <LoadingSkeleton className='size-5 rounded-sm' />
            <LoadingSkeleton className='h-4 w-40' />
          </div>

          <LoadingSkeleton className='h-12 w-full rounded-md' />

          <div className='flex justify-center gap-4'>
            <LoadingSkeleton className='h-4 w-24' />
            <LoadingSkeleton className='h-4 w-20' />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormPageSkeleton;
