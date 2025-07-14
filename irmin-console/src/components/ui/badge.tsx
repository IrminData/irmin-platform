import type { HTMLAttributes } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/tw';

const badgeVariants = cva(
  `
    inline-flex w-max items-center rounded-md border p-1 text-xs font-normal
    transition-colors
    focus:outline-hidden
  `,
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

interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge };
