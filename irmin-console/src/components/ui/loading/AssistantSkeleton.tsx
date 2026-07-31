import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Mirror skeleton for `AssistantSection`: conversations sidebar
 * (`w-80`, desktop only — `xl:flex`) + main chat card (title + chat
 * transcript + composer). Mobile hides the sidebar behind a Sheet.
 */
const AssistantSkeleton = () => {
  return (
    <div className='flex h-full flex-col bg-background'>
      <div
        className={`
          flex h-full flex-col
          xl:flex-row
        `}
      >
        {/* Desktop sidebar */}
        <div
          className={`
            hidden w-80 flex-col gap-2 border-r border-border p-3
            xl:flex xl:shrink-0
          `}
        >
          <LoadingSkeleton className='mb-2 h-10 w-full rounded-md' />
          <LoadingSkeleton className='h-9 w-full rounded-md' />
          {Array.from({ length: 8 }).map((_, i) => (
            <LoadingSkeleton
              key={`conv-${i}`}
              className='h-12 w-full rounded-md'
            />
          ))}
        </div>

        {/* Main chat area */}
        <div
          className={`
            flex h-full flex-1 flex-col p-2
            xl:mx-auto xl:max-w-5xl xl:p-4
          `}
        >
          <div
            className={`
              flex size-full flex-col rounded-lg border border-border bg-card
            `}
          >
            <div
              className={`
                flex items-center justify-between border-b border-border p-2
                xl:p-6
              `}
            >
              <LoadingSkeleton className='h-5 w-48' />
              <LoadingSkeleton className='size-8 rounded-md' />
            </div>
            <div className='flex flex-1 flex-col gap-4 p-4'>
              {/* Assistant message */}
              <div className='flex max-w-xl flex-col gap-2'>
                <LoadingSkeleton className='h-4 w-3/4' />
                <LoadingSkeleton className='h-4 w-full' />
                <LoadingSkeleton className='h-4 w-2/3' />
              </div>
              {/* User message */}
              <div className='flex max-w-md flex-col gap-2 self-end'>
                <LoadingSkeleton className='h-4 w-40' />
                <LoadingSkeleton className='h-4 w-56' />
              </div>
              {/* Assistant message */}
              <div className='flex max-w-xl flex-col gap-2'>
                <LoadingSkeleton className='h-4 w-5/6' />
                <LoadingSkeleton className='h-4 w-2/3' />
              </div>
            </div>
            {/* Composer */}
            <div className='border-t border-border p-3'>
              <LoadingSkeleton className='h-12 w-full rounded-md' />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistantSkeleton;
