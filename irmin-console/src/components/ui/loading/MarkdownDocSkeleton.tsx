import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Mirror skeleton for rendered markdown documentation pages.
 *
 * A few heading bars, prose-style line groups at varying widths, and
 * occasional code-block placeholders — so the final markdown page
 * slots in without layout shift.
 */
const MarkdownDocSkeleton = ({ className = '' }: { className?: string }) => {
  return (
    <div
      className={`
        container mx-auto max-w-3xl px-4 py-6
        ${className}
      `}
    >
      {/* H1 */}
      <LoadingSkeleton className='mb-4 h-9 w-3/4' />

      {/* Intro paragraph */}
      <div className='mb-6 flex flex-col gap-2'>
        <LoadingSkeleton className='h-4 w-full' />
        <LoadingSkeleton className='h-4 w-full' />
        <LoadingSkeleton className='h-4 w-5/6' />
      </div>

      {/* H2 + paragraph */}
      <LoadingSkeleton className='mt-8 mb-3 h-6 w-1/2' />
      <div className='mb-6 flex flex-col gap-2'>
        <LoadingSkeleton className='h-4 w-full' />
        <LoadingSkeleton className='h-4 w-4/5' />
      </div>

      {/* Code block */}
      <LoadingSkeleton className='mb-6 h-32 w-full rounded-md' />

      {/* H2 + paragraph */}
      <LoadingSkeleton className='mt-8 mb-3 h-6 w-2/5' />
      <div className='flex flex-col gap-2'>
        <LoadingSkeleton className='h-4 w-full' />
        <LoadingSkeleton className='h-4 w-full' />
        <LoadingSkeleton className='h-4 w-3/4' />
      </div>
    </div>
  );
};

export default MarkdownDocSkeleton;
