import { cn } from '@/utils/tw';

/**
 * Page-level title primitive. Uses Geist Sans bold per DESIGN.md's in-app
 * typography rule. Adds `text-balance` so multi-line titles balance
 * across lines, and `scroll-mt-20` so hash-anchor scrolls leave a breather
 * under the h-14 top bar.
 */
function DisplayTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={cn(
        `
          scroll-mt-20 font-main text-2xl font-bold tracking-tight text-balance
          text-foreground/90
          sm:text-3xl
        `,
        className
      )}
    >
      {children}
    </h1>
  );
}

export default DisplayTitle;
