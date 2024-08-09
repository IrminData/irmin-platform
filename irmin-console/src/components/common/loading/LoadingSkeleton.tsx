/**
 * Loading skeleton component
 */
const LoadingSkeleton = ({ className }: { className?: string }) => {
  return (
    <div
      id='loading-skeleton'
      className={`w-full ${className ?? 'mx-auto my-4 h-32 px-4'}`}
    >
      <div className='h-full w-full animate-pulse rounded-lg bg-gray-300 opacity-10'></div>
    </div>
  );
};

export default LoadingSkeleton;
