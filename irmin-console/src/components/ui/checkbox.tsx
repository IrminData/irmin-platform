'use client';

import * as React from 'react';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';

import { TbCheck } from 'react-icons/tb';

import { cn } from '@/utils/tw';

const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      `
        peer size-4 shrink-0 rounded-sm border border-accent bg-card shadow-xs
        focus-visible:ring-1 focus-visible:ring-ring
        focus-visible:outline-hidden
        disabled:cursor-not-allowed disabled:opacity-50
        data-[state=checked]:bg-accent data-[state=checked]:text-foreground
      `,
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn('flex items-center justify-center text-current')}
    >
      <TbCheck size={12} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
