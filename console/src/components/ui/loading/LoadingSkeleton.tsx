import { cn } from '@/utils/tw';

/**
 * Base skeleton primitive.
 *
 * Pulsing `bg-muted` rectangle — semantic token, inherits light/dark
 * automatically. Composed by every other skeleton in the codebase.
 * Avoid fixed palette utilities (see DESIGN.md — skeletons).
 */
const LoadingSkeleton = ({ className }: { className?: string }) => {
  return (
    <div
      aria-hidden='true'
      className={cn(
        'animate-pulse rounded-[2px] bg-muted',
        className ?? 'mx-auto my-4 h-32 w-full px-4'
      )}
    />
  );
};

export default LoadingSkeleton;
