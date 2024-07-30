/**
 * Loading skeleton component
 */
const LoadingSkeleton = ({ className }: { className?: string }) => {
  return (
    <div
      className={`my-4 h-32 w-full animate-pulse rounded-lg bg-gray-300 opacity-10 ${className ?? ''}`}
    ></div>
  );
};

export default LoadingSkeleton;
