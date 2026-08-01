import type { HTMLAttributes } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/tw';

const badgeVariants = cva(
  `
    inline-flex w-max items-center rounded-[2px] px-1.5 py-0.5 text-[11px]
    font-medium tracking-[0.02em] transition-colors duration-150
    focus:outline-hidden
  `,
  {
    variants: {
      variant: {
        default: 'bg-accent/15 text-accent',
        primary: 'bg-muted text-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive/15 text-destructive',
        outline: 'border border-border text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge };
