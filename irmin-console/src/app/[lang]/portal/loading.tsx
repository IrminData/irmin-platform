import LoadingSkeleton from '@/components/misc/LoadingSkeleton';

export default function PortalLoading() {
  return (
    <div className='px-4'>
      <LoadingSkeleton className='h-96 w-full' />
    </div>
  );
}
