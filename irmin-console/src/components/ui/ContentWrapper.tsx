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
    <div className={cn('relative container mx-auto my-8 max-w-7xl', className)}>
      <div
        className={cn(
          'border-accent bg-background w-full max-w-3xl rounded-lg border-t border-b px-4 py-4 shadow-md md:mx-4',
          wrapperClassName
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default ContentWrapper;
