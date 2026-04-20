import { cn } from '@/utils/tw';

interface LogoProps {
  className?: string;
}

/**
 * Pure-type wordmark. "irmin" in Fraunces display with a single lime accent
 * dot. Adapts to theme via `text-foreground` (currentColor) — no variant
 * prop needed; caller controls size via `className` (font-size inheritance).
 *
 * Use this in every in-app surface that renders the Irmin brand. For
 * external/raster surfaces (OG images, Clerk branding, email) reach for
 * `/public/brand/lockup-horizontal-*.svg` instead.
 */
export function Logo({ className }: LogoProps) {
  return (
    <span
      aria-label='Irmin'
      // `normal-case` is defensive: some parents (mono eyebrows) apply
      // `uppercase`, which is inherited. The wordmark must stay lowercase.
      className={cn(
        `
          relative inline-flex items-baseline font-display text-[1.45rem]
          leading-none font-semibold tracking-[-0.03em] text-foreground
          normal-case select-none
          md:text-[1.55rem]
        `,
        className
      )}
      style={{ fontVariationSettings: "'opsz' 60, 'SOFT' 20, 'WONK' 1" }}
    >
      irmin
      <span
        aria-hidden='true'
        className='
          ml-[0.18em] size-[0.32em] -translate-y-[0.08em] rounded-full bg-accent
        '
      />
    </span>
  );
}
