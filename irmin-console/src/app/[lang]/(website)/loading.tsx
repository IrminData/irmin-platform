import LoadingSpinner from '@/components/misc/LoadingSpinner';

export default function Websiteloading() {
  return (
    <div className='flex h-full w-full flex-col items-center justify-center p-2'>
      <LoadingSpinner />
    </div>
  );
}
