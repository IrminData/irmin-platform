/**
 * Loading skeleton component
 */
const LoadingSkeleton = ({ className }: { className?: string }) => {
  return (
    <div
      id='loading-skeleton'
      className={`
        w-full
        ${className ?? 'mx-auto my-4 h-32 px-4'}
      `}
    >
      <div
        className={`
          size-full animate-pulse rounded-lg bg-gray-200 opacity-10
          dark:bg-gray-800
        `}
      />
    </div>
  );
};

export default LoadingSkeleton;
