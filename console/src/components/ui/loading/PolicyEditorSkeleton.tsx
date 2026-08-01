import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Mirror skeleton for the policy editor — matches the layout of
 * `src/components/ui/policy-editor/index.tsx`: title + description
 * header, "New policy" button, filters row, policies table.
 */
const PolicyEditorSkeleton = () => {
  return (
    <div className='flex flex-col gap-4 p-4'>
      <div className='flex items-center justify-between'>
        <div className='flex flex-col gap-2'>
          <LoadingSkeleton className='h-6 w-48' />
          <LoadingSkeleton className='h-4 w-64 max-w-full' />
        </div>
        <LoadingSkeleton className='h-10 w-32 rounded-md' />
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        <LoadingSkeleton className='h-9 w-64 rounded-md' />
        <LoadingSkeleton className='h-9 w-32 rounded-md' />
        <LoadingSkeleton className='h-9 w-28 rounded-md' />
      </div>
      <LoadingSkeleton className='h-80 w-full rounded-md' />
    </div>
  );
};

export default PolicyEditorSkeleton;
