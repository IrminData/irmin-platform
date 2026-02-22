const SkeletonField = () => (
  <div className='space-y-2'>
    <div
      className={`
        h-4 w-20 animate-pulse rounded-sm bg-gray-200
        dark:bg-gray-800
      `}
    />
    <div
      className={`
        h-10 w-full animate-pulse rounded-sm bg-gray-200
        dark:bg-gray-800
      `}
    />
  </div>
);
const SkeletonCheckbox = () => (
  <div className='flex items-center gap-3'>
    <div
      className={`
        size-5 animate-pulse rounded-sm bg-gray-200
        dark:bg-gray-800
      `}
    />
    <div
      className={`
        h-4 w-40 animate-pulse rounded-sm bg-gray-200
        dark:bg-gray-800
      `}
    />
  </div>
);
const SkeletonButton = () => (
  <div className='pt-4'>
    <div
      className={`
        h-12 w-full animate-pulse rounded-sm bg-gray-200
        dark:bg-gray-800
      `}
    />
  </div>
);
const SkeletonSecondaryAction = () => (
  <div className='flex justify-center space-x-4'>
    <div
      className={`
        h-4 w-24 animate-pulse rounded-sm bg-gray-200
        dark:bg-gray-800
      `}
    />
    <div
      className={`
        h-4 w-20 animate-pulse rounded-sm bg-gray-200
        dark:bg-gray-800
      `}
    />
  </div>
);

/**
 * Skeleton for form pages (authentication, settings, etc.)
 */
const FormPageSkeleton = () => {
  return (
    <div className='relative container mx-auto max-w-lg px-4 py-24'>
      <div className='rounded-lg border bg-card p-4 shadow-sm'>
        {/* Form title */}
        <div className='mb-8 text-center'>
          <div
            className={`
              mx-auto mb-4 h-8 w-48 animate-pulse rounded-sm bg-gray-200
              dark:bg-gray-800
            `}
          />
          <div
            className={`
              mx-auto h-4 w-64 animate-pulse rounded-sm bg-gray-200
              dark:bg-gray-800
            `}
          />
        </div>

        {/* Form fields */}
        <div className='space-y-6'>
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />

          {/* Checkbox/toggle field */}
          <SkeletonCheckbox />

          {/* Submit button */}
          <SkeletonButton />

          {/* Secondary actions */}
          <SkeletonSecondaryAction />
        </div>
      </div>
    </div>
  );
};

export default FormPageSkeleton;
