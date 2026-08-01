import { cn } from '@/utils/tw';

/**
 * Page-level title primitive. Uses Fraunces (display) per the Almanac
 * system — see DESIGN.md → "Typography". Adds `text-balance` so multi-line
 * titles balance across lines, and `scroll-mt-20` so hash-anchor scrolls
 * leave a breather under the h-14 top bar.
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
          scroll-mt-20 font-display text-2xl font-semibold tracking-tight
          text-balance text-foreground
          sm:text-3xl
        `,
        className
      )}
      style={{ fontVariationSettings: "'opsz' 120, 'SOFT' 30, 'WONK' 0" }}
    >
      {children}
    </h1>
  );
}

export default DisplayTitle;
