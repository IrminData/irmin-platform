'use client';

import type { HTMLAttributes } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/tw';

// Define the variant styles for the StatusBadge component using class-variance-authority (cva)
/*
 * StatusBadge — low-saturation status pills. On Almanac these read as
 * quiet labels, not loud announcements. Color signals tone (success /
 * muted / destructive) via a tinted bg + matching text, never a solid
 * saturated fill.
 */
const statusBadgeVariants = cva(
  `
    inline-flex size-auto min-h-6 min-w-20 items-center justify-center
    rounded-[2px] border border-transparent px-2 py-0.5 text-center text-[11px]
    font-medium tracking-[0.02em]
  `,
  {
    variants: {
      /*
       * Status intent — accent is reserved for ACTIVE states (running,
       * initiating, connected, pending). Historical "complete" and
       * terminal statuses (paused, cancelled) go muted. A successful
       * finished thing is inert; the eye should land on what needs
       * attention, not on a row of lime "Complete" pills.
       */
      status: {
        '': 'border-border bg-muted text-muted-foreground',
        private: 'border-border bg-muted text-muted-foreground',
        public: 'border-border bg-muted text-foreground',
        connected: 'border-accent/30 bg-accent/15 text-foreground',
        cancelled: 'border-border bg-muted text-muted-foreground',
        error: 'border-destructive/30 bg-destructive/15 text-foreground',
        complete: 'border-border bg-muted text-muted-foreground',
        running: 'border-accent/30 bg-accent/15 text-foreground',
        cancelling: 'border-accent/30 bg-accent/15 text-foreground',
        paused: 'border-border bg-muted text-muted-foreground',
        pending: 'border-accent/30 bg-accent/15 text-foreground',
        initiating: 'border-accent/30 bg-accent/15 text-foreground',
        default: 'border-border bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      status: 'default',
    },
  }
);

// Define the prop types for the StatusBadge component using TypeScript
interface StatusBadgeProps
  extends
    HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  label: string;
}

// Create the StatusBadge component with the new structure and variant-based styles
const StatusBadge = ({
  status,
  label,
  className,
  ...props
}: StatusBadgeProps) => {
  // Capitalise the first letter of the label
  const capitalisedLabel = label.charAt(0).toUpperCase() + label.slice(1);

  return (
    <div className={cn(statusBadgeVariants({ status, className }))} {...props}>
      {capitalisedLabel}
    </div>
  );
};

export default StatusBadge;
