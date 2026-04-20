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
    rounded-[2px] px-2 py-0.5 text-center text-[11px] font-medium
    tracking-[0.02em]
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
        '': 'bg-muted text-muted-foreground',
        private: 'bg-muted text-muted-foreground',
        public: 'bg-muted text-foreground',
        connected: 'bg-accent/15 text-accent',
        cancelled: 'bg-muted text-muted-foreground',
        error: 'bg-destructive/15 text-destructive',
        complete: 'bg-muted text-muted-foreground',
        running: 'bg-accent/15 text-accent',
        paused: 'bg-muted text-muted-foreground',
        pending: 'bg-accent/15 text-accent',
        initiating: 'bg-accent/15 text-accent',
        default: 'bg-muted text-muted-foreground',
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
