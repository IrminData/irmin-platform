import LoadingSkeleton from '@/components/misc/LoadingSkeleton';

export default function AppLoading() {
  return (
    <div className='px-4'>
      <LoadingSkeleton className='h-96 w-full' />
    </div>
  );
}
