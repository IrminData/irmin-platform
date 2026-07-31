import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Mirror skeleton for form-based pages — settings, profile, tag detail,
 * schedule, etc. Label + input row per field, submit button at bottom.
 */
const FormSkeleton = ({
  fieldCount = 4,
  showTitle = true,
  showSubmit = true,
  className = '',
}: {
  fieldCount?: number;
  showTitle?: boolean;
  showSubmit?: boolean;
  className?: string;
}) => {
  return (
    <div
      className={`
        container mx-auto max-w-3xl px-4 py-6
        ${className}
      `}
    >
      {showTitle && (
        <div className='mb-8 flex flex-col gap-2'>
          <LoadingSkeleton className='h-8 w-56' />
          <LoadingSkeleton className='h-4 w-96 max-w-full' />
        </div>
      )}
      <div className='flex flex-col gap-6'>
        {Array.from({ length: fieldCount }).map((_, i) => (
          <div key={`field-${i}`} className='flex flex-col gap-2'>
            <LoadingSkeleton className='h-4 w-32' />
            <LoadingSkeleton className='h-10 w-full rounded-md' />
            <LoadingSkeleton className='h-3 w-2/3' />
          </div>
        ))}
        {showSubmit && (
          <div className='mt-2 flex items-center justify-end gap-2'>
            <LoadingSkeleton className='h-10 w-24 rounded-md' />
            <LoadingSkeleton className='h-10 w-28 rounded-md' />
          </div>
        )}
      </div>
    </div>
  );
};

export default FormSkeleton;
