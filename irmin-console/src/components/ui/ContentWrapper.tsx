import { cn } from '@/utils/tw';

/**
 * ContentWrapper component to wrap content in a container with a border and shadow
 *
 * @param props - The props
 * @param props.className - The class name for the container
 * @param props.wrapperClassName - The class name for the div wrapping the content
 * @param props.children - The children to render inside the wrapper
 */
const ContentWrapper = ({
  children,
  className,
  wrapperClassName,
}: {
  children: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
}) => {
  return (
    <div
      className={cn(
        'relative container my-8 max-w-7xl px-2 sm:mx-auto',
        className
      )}
    >
      <div
        className={cn(
          'bg-popover/10 w-full max-w-3xl max-w-full rounded-lg border p-2 dark:border-gray-800',
          wrapperClassName
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default ContentWrapper;
