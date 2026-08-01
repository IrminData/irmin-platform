import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Mirror skeleton for `<TabsWithBackButton>`.
 *
 * Renders the `size-11` circular back button stub + N primary tab stubs
 * at the same widths and gaps as the real component, plus the
 * `md:border-b` underline so the layout lines up exactly. All blocks
 * compose `<LoadingSkeleton>` so they inherit the base primitive's
 * colour token and animation.
 */
const TabsWithBackButtonSkeleton = ({
  tabCount = 3,
  showMore = true,
}: {
  tabCount?: number;
  showMore?: boolean;
}) => {
  return (
    <div
      className={`
        scrollbar-hide mb-6 flex w-full justify-start gap-2 overflow-y-hidden
        px-4
      `}
    >
      {/* Back button stub — matches ButtonWithTooltip size='lg' rounded-full */}
      <LoadingSkeleton className='size-11 shrink-0 rounded-full' />
      <div
        className={`
          flex w-full flex-row gap-0 border-border
          md:border-b
        `}
      >
        {Array.from({ length: tabCount }).map((_, i) => (
          <LoadingSkeleton
            key={`tab-${i}`}
            className='h-11 w-28 shrink-0 rounded-t-md'
          />
        ))}
        {showMore && (
          <LoadingSkeleton className='ml-1 h-11 w-20 shrink-0 rounded-t-md' />
        )}
      </div>
    </div>
  );
};

export default TabsWithBackButtonSkeleton;
