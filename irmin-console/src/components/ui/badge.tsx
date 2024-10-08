import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/tw';

const badgeVariants = cva(
  'inline-flex w-max items-center rounded-md border px-1 py-0.2 text-xs font-normal transition-colors focus:outline-none',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-accent/80 text-accent-foreground',
        primary: 'border-transparent bg-primary/80 text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
