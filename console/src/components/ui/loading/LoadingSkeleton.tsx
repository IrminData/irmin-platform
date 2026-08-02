import { cn } from '@/utils/tw';

/**
 * Base skeleton primitive.
 *
 * Pulsing `bg-muted` rectangle — semantic token, inherits light/dark
 * automatically. Composed by every other skeleton in the codebase.
 * Never raw `bg-gray-*` (see DESIGN.md — skeletons).
 */
const LoadingSkeleton = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-sm bg-muted',
        className ?? 'mx-auto my-4 h-32 w-full px-4'
      )}
    />
  );
};

export default LoadingSkeleton;
