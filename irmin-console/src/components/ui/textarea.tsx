import * as React from 'react';

import { cn } from '@/utils/tw';

/**
 * Underline-only textarea (Almanac style). `field-sizing: content` means
 * the height grows with typed content — do NOT pass `rows={N}`; it will
 * override the field-sizing height and leave an empty gap.
 */
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot='textarea'
      className={cn(
        `
          flex field-sizing-content min-h-24 w-full resize-y border-0 border-b
          border-input bg-transparent px-0 py-2.5 text-base transition-colors
          duration-150 outline-none
          placeholder:text-muted-foreground/70
          focus:border-accent
          focus-visible:border-accent
          disabled:cursor-not-allowed disabled:opacity-50
          aria-invalid:border-destructive
          md:text-sm
        `,
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
