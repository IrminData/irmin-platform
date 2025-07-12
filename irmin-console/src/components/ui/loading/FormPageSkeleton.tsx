/**
 * Skeleton for form pages (authentication, settings, etc.)
 */
const FormPageSkeleton = () => {
  return (
    <div className='relative container mx-auto max-w-2xl px-4 py-28'>
      <div className='bg-card rounded-lg border p-8 shadow-sm'>
        {/* Form title */}
        <div className='mb-8 text-center'>
          <div className='mx-auto mb-4 h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
          <div className='mx-auto h-4 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
        </div>

        {/* Form fields */}
        <div className='space-y-6'>
          {[...Array(4)].map((_, index) => (
            <div key={`form-field-${index}`} className='space-y-2'>
              <div className='h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
              <div className='h-10 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
            </div>
          ))}

          {/* Checkbox/toggle field */}
          <div className='flex items-center gap-3'>
            <div className='h-5 w-5 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
            <div className='h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
          </div>

          {/* Submit button */}
          <div className='pt-4'>
            <div className='h-12 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
          </div>

          {/* Secondary actions */}
          <div className='flex justify-center space-x-4'>
            <div className='h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
            <div className='h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800'></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormPageSkeleton;