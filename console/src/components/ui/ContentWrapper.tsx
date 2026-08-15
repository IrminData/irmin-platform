import { cn } from '@/utils/tw';

/**
 * ContentWrapper component to group content on a flat, bordered surface.
 *
 * @param props - The props
 * @param props.className - The class name for the container
 * @param props.wrapperClassName - The class name for the div wrapping the content
 * @param props.children - The children to render inside the wrapper
 */
export const ContentWrapper = ({
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
        `
          relative container my-8 max-w-7xl px-2
          sm:mx-auto
        `,
        className
      )}
    >
      <div
        className={cn(
          `w-full max-w-full rounded-[2px] border border-border bg-card p-2`,
          wrapperClassName
        )}
      >
        {children}
      </div>
    </div>
  );
};
