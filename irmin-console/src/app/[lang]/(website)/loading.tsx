import LoadingSkeleton from '@/components/misc/LoadingSkeleton';

export default function Websiteloading() {
  return (
    <div className='flex h-full w-full flex-col items-center justify-center p-2'>
      <LoadingSkeleton />
    </div>
  );
}
