import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Loading UI for the Console
 *
 * @remarks
 *
 * When Next.js is processing server-side data fetching,
 * it shows this loading UI element
 */
export default function ConsoleLoading() {
  return (
    <div
      id='console-loading'
      className='relative container mx-auto max-w-6xl py-12'
    >
      <LoadingSkeleton className='h-96' />
    </div>
  );
}
